/**
 * routes/connect.ts  (updated)
 *
 * Rate limit changes:
 *  - /connect/github (OAuth initiation) → STRICT (per IP, same as /auth/github)
 *  - /connect/github/callback           → STRICT
 *  - /connect/status                    → MODERATE (read, per user ID)
 *  - /connect/:platform (DELETE)        → MODERATE (mutation, per user ID)
 *
 * No business logic modified.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { encrypt } from '../utils/encryption.js';
import { strictRateLimit, moderateRateLimit } from '../plugins/rate-limit.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// Follow-capable tokens are stored under a dedicated platform key so that
// the authentication flow (read:user user:email scope, key = 'github') and
// the connect flow (user:follow scope, key = 'github_follow') never share
// the same OAuthToken record.  Whichever flow runs last can no longer
// silently overwrite the other's access token.
const GITHUB_FOLLOW_PLATFORM = 'github_follow';

interface OAuthCallbackQuery {
  code: string;
  state?: string;
}

interface ParsedOAuthState {
  userId: string;
  nonce: string;
}

export async function connectRoutes(app: FastifyInstance) {
  // ─── Status ───
  app.get('/status', { preHandler: [app.authenticate], ...moderateRateLimit }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const tokens = await app.prisma.oAuthToken.findMany({
      where: { userId },
      select: { platform: true, createdAt: true, scopes: true },
    });
    return { connectedPlatforms: tokens };
  });

  // ─── GitHub Connect (initiation) ───
  app.get('/github', { preHandler: [app.authenticate], ...strictRateLimit }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const state = JSON.stringify({
      userId: (request.user as any).id,
      nonce: generateState(),
    });

    const redirectUri = `${process.env.BACKEND_URL}/api/connect/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'user:follow',
      state: Buffer.from(state).toString('base64'),
    });

    return reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
  });

  // ─── GitHub Connect (callback) ───
  app.get('/github/callback', strictRateLimit, async (
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    reply: FastifyReply
  ) => {
    const { code, state } = request.query;

    if (!code || !state) {
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=missing_params`);
    }

    try {
      const decodedState = parseOAuthState(state);
      if (!decodedState) {
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      const userId = decodedState.userId;
      if (!userId) {
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=invalid_state`);
      }

      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.BACKEND_URL}/api/connect/github/callback`,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (tokenData.error) {
        app.log.error('GitHub connect token error:', tokenData);
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      const encryptedToken = encrypt(tokenData.access_token);
      await app.prisma.oAuthToken.upsert({
        where: { userId_platform: { userId, platform: 'github' } },
        update: { accessToken: encryptedToken, scopes: tokenData.scope || 'user:follow' },
        create: {
          userId,
          platform: GITHUB_FOLLOW_PLATFORM,
          accessToken: encryptedToken,
          scopes: tokenData.scope || 'user:follow',
        },
      });

      if (decodedState.nonce.startsWith('mobile_')) {
        return reply.redirect(`${process.env.MOBILE_REDIRECT_URI}?connected=github`);
      }

      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?connected=github`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error({ err, message }, 'GitHub connect error');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=server_error`);
    }
  });

  // ─── Disconnect ───
  app.delete('/:platform', { preHandler: [app.authenticate], ...moderateRateLimit }, async (
    request: FastifyRequest<{ Params: { platform: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { platform } = request.params;

    try {
      await app.prisma.oAuthToken.delete({
        where: { userId_platform: { userId, platform } },
      });
      return { success: true };
    } catch (error) {
      return reply.status(404).send({ error: 'Connection not found' });
    }
  });
}

function parseOAuthState(state: string): ParsedOAuthState | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    if (typeof decoded.userId !== 'string' || typeof decoded.nonce !== 'string') return null;
    return decoded;
  } catch {
    return null;
  }
}

function generateState(): string {
  return randomBytes(32).toString('hex');
}
