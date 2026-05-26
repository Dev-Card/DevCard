import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { encrypt } from '../utils/encryption.js';
import { config } from '../config.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

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
    const state = JSON.stringify({
      userId: (request.user as any).id,
      nonce: generateState(),
    });

    const redirectUri = `${config.app.backendUrl}/api/connect/github/callback`;
    const params = new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: redirectUri,
      scope: 'user:follow',
      state: Buffer.from(state).toString('base64'),
    });

    return reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
  });

  return reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
});

  app.get('/github/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    const { code, state } = request.query;

    if (!code || !state) {
      return reply.redirect(`${config.app.publicUrl}/settings?error=missing_params`);
    }

    try {
      const decodedState = parseOAuthState(state);

      if (!decodedState) {
        return reply.redirect(`${config.app.publicUrl}/settings?error=connect_failed`);
      }

      if (!userId) {
        return reply.redirect(`${config.app.publicUrl}/settings?error=invalid_state`);
      }

      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.github.clientId,
          client_secret: config.github.clientSecret,
          code,
          redirect_uri: `${config.app.backendUrl}/api/connect/github/callback`,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;

      if (tokenData.error) {
        app.log.error('GitHub connect token error:', tokenData);
        return reply.redirect(`${config.app.publicUrl}/settings?error=connect_failed`);
      }

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
        return reply.redirect(`${config.app.mobileRedirectUri}?connected=github`);
      }

      return reply.redirect(`${config.app.publicUrl}/settings?connected=github`);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error({ err, message }, 'GitHub connect error');
      return reply.redirect(`${config.app.publicUrl}/settings?error=server_error`);
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

    if (typeof decoded.userId !== "string" || typeof decoded.nonce !== "string") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function generateState(): string {
  return randomBytes(32).toString('hex');
}
