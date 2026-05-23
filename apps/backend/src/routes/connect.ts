import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { encrypt } from '../utils/encryption.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// Nonce TTL: 10 minutes — generous for a login round-trip, short enough to
// limit the window a leaked state URL could be abused.
const OAUTH_NONCE_TTL_SECONDS = 600;

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

  app.get('/status', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    const tokens = await app.prisma.oAuthToken.findMany({
      where: { userId },
      select: { platform: true, createdAt: true, scopes: true },
    });

    return { connectedPlatforms: tokens };
  });

  // ─── GitHub Connect ───

  app.get('/github', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const nonce = generateNonce();

    // Persist the nonce server-side before issuing the redirect.
    // The callback will look up this key to prove the request originated here.
    // Fail closed: if Redis is unavailable we must not issue the redirect —
    // a missing nonce store would leave the callback with no way to validate state.
    try {
      await app.redis.set(
        `oauth:nonce:${nonce}`,
        userId,
        'EX',
        OAUTH_NONCE_TTL_SECONDS,
      );
    } catch (err) {
      app.log.error({ err }, 'Failed to persist OAuth nonce — aborting connect flow');
      return reply.status(500).send({ error: 'Failed to initiate OAuth flow' });
    }

    const state = Buffer.from(JSON.stringify({ userId, nonce })).toString('base64');
    const redirectUri = `${process.env.BACKEND_URL}/api/connect/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'user:follow',
      state,
    });

    return reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
  });

  app.get('/github/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    const { code, state } = request.query;

    if (!code || !state) {
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=missing_params`);
    }

    try {
      // ── Step 1: parse state ────────────────────────────────────────────────
      const decodedState = parseOAuthState(state);
      if (!decodedState) {
        app.log.warn('OAuth callback received malformed or unparseable state payload');
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      // ── Step 2: validate nonce server-side ────────────────────────────────
      // Look up the nonce in Redis and consume it immediately (single-use).
      // Any failure — unknown nonce, expired nonce, replay, userId mismatch,
      // or Redis error — is treated as a forged request and fails closed.
      let storedUserId: string | null;
      try {
        const nonceKey = `oauth:nonce:${decodedState.nonce}`;
        storedUserId = await app.redis.get(nonceKey);
        if (storedUserId !== null) {
          // Delete before token exchange so a mid-flight error cannot leave
          // a reusable nonce in the store.
          await app.redis.del(nonceKey);
        }
      } catch (err) {
        app.log.error({ err }, 'Redis error during OAuth nonce lookup — aborting callback');
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=server_error`);
      }

      if (storedUserId === null) {
        // Nonce unknown or already expired/consumed — replay or forged request
        app.log.warn('OAuth callback nonce not found in Redis — possible replay or forged state');
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      if (storedUserId !== decodedState.userId) {
        // Nonce exists but was issued for a different user — state was tampered
        app.log.warn('OAuth nonce userId mismatch — state payload does not match issuing session');
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      // Use the Redis-sourced userId as authoritative — never trust state alone.
      const userId = storedUserId;

      // ── Step 3: exchange code for token ───────────────────────────────────
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
        app.log.error('GitHub token exchange failed during connect flow');
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      // ── Step 4: persist encrypted token ───────────────────────────────────
      const encryptedToken = encrypt(tokenData.access_token);

      await app.prisma.oAuthToken.upsert({
        where: {
          userId_platform: {
            userId,
            platform: 'github',
          },
        },
        update: {
          accessToken: encryptedToken,
          scopes: tokenData.scope || 'user:follow',
        },
        create: {
          userId,
          platform: 'github',
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

  app.delete('/:platform', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Params: { platform: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { platform } = request.params;

    const SUPPORTED_PLATFORMS = ['github', 'google', 'twitter', 'linkedin'];
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return reply.status(400).send({ error: `Unsupported platform: ${platform}` });
    }

    try {
      await app.prisma.oAuthToken.delete({
        where: {
          userId_platform: {
            userId,
            platform,
          },
        },
      });
      return { success: true };
    } catch (err) {
      return reply.status(404).send({ error: 'Connection not found' });
    }
  });
}

function parseOAuthState(state: string): ParsedOAuthState | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

    if (typeof decoded.userId !== 'string' || typeof decoded.nonce !== 'string') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function generateNonce(): string {
  return randomBytes(32).toString('hex');
}
