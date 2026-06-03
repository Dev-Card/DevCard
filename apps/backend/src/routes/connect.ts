import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { encrypt } from '../utils/encryption.js';

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

  app.get('/status', {
    preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
    }],
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
    preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const nonce = generateState();

    // Store nonce in Redis with 10-minute TTL.
    // The callback verifies this to prevent CSRF attacks.
    await app.redis.set(
      `oauth:nonce:${nonce}`,
      userId,
      'EX',
      600
    );

    const state = JSON.stringify({ userId, nonce });

    const redirectUri = `${process.env.BACKEND_URL}/api/connect/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'user:follow',
      state: Buffer.from(state).toString('base64'),
    });

    return reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
  });

  app.get('/github/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    const { code, state } = request.query;

    if (!code || !state) {
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=missing_params`);
    }

    try {
      // Decode state to find which user requested the connect
      const decodedState = parseOAuthState(state);

      if (!decodedState) {
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
      }

      // Verify nonce was issued by this server -- prevents CSRF
      const storedUserId = app.redis ? await app.redis.get(`oauth:nonce:${decodedState.nonce}`) : null;

      if (app.redis && (!storedUserId || storedUserId !== decodedState.userId)) {
        app.log.warn({ nonce: decodedState.nonce }, 'OAuth CSRF check failed: nonce mismatch');
        return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=invalid_state`);
      }

      // Consume the nonce -- one-time use only (if redis configured)
      if (app.redis) await app.redis.del(`oauth:nonce:${decodedState.nonce}`);

      const userId = decodedState.userId;

      // Exchange code for token
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

      // Encrypt and store the token under the dedicated follow-scope key so
      // that a subsequent login (which writes to 'github') cannot overwrite
      // this follow-capable credential.
      const encryptedToken = encrypt(tokenData.access_token);

      await app.prisma.oAuthToken.upsert({
        where: {
          userId_platform: {
            userId,
            platform: GITHUB_FOLLOW_PLATFORM,
          },
        },
        update: {
          accessToken: encryptedToken,
          scopes: tokenData.scope || 'user:follow',
        },
        create: {
          userId,
          platform: GITHUB_FOLLOW_PLATFORM,
          accessToken: encryptedToken,
          scopes: tokenData.scope || 'user:follow',
        },
      });

      // Redirect back to app settings
      // If mobile, use custom scheme
      if (decodedState.nonce.startsWith('mobile_')) {
        return reply.redirect(`${process.env.MOBILE_REDIRECT_URI}?connected=github`);
      }

      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?connected=github`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      app.log.error({ error, message }, 'GitHub connect error');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=server_error`);
    }
  });


  // ─── Disconnect ───

  app.delete('/:platform', {
    preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
    }],
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
    } catch (error) {
      return reply.status(404).send({ error: 'Connection not found' });
    }
  });
}

function parseOAuthState(state: string): ParsedOAuthState | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

    // validating the OAuth state structure which is expected
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
