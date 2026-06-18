import { randomBytes } from 'node:crypto';

import { decrypt, encrypt } from '../utils/encryption.js';
import { getErrorMessage } from '../utils/error.util.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// Follow-capable tokens are stored under a dedicated platform key so that
// the authentication flow (read:user user:email scope, key = 'github') and
// the connect flow (user:follow scope, key = 'github_follow') never share
// the same OAuthToken record.  Whichever flow runs last can no longer
// silently overwrite the other's access token.
const GITHUB_FOLLOW_PLATFORM = 'github_follow';
const GITHUB_AUTODISCOVER_CACHE_TTL = 3600;
const NONCE_TTL = 600; // 10 minutes

interface OAuthCallbackQuery {
  code: string;
  state?: string;
}

interface StoredConnectNonce {
  userId: string;
}

export async function connectRoutes(app: FastifyInstance): Promise<void> {
  // ─── Status ───

  app.get('/status', {
    preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
    }],
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
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
      try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const nonce = randomBytes(32).toString('hex');

    await app.redis.set(
      `oauth:connect-nonce:${nonce}`,
      JSON.stringify({ userId } satisfies StoredConnectNonce),
      'EX',
      NONCE_TTL
    );

    const redirectUri = `${process.env.BACKEND_URL}/api/connect/github/callback`;
    const params = new URLSearchParams({
      client_id: (process.env.GITHUB_CLIENT_ID || '').trim(),
      redirect_uri: redirectUri,
      scope: 'user:follow',
      state: nonce,
    });

    app.log.debug({ provider: 'github', userId }, 'OAuth connect redirect initiated');
    return reply.redirect(`${GITHUB_AUTH_URL}?${params}`);
  });

  app.get('/github/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    const { code, state } = request.query;

    if (!code || !state) {
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=missing_params`);
    }

    const nonce = parseNonce(state);
    if (!nonce) {
      app.log.warn({}, 'OAuth connect state validation failed: malformed state');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
    }

    // Atomically consume the nonce — closes the replay TOCTOU window
    let storedRaw: string | null;
    try {
      storedRaw = await app.redis.getdel(`oauth:connect-nonce:${nonce}`);
    } catch (err: unknown) {
      app.log.error({ err: getErrorMessage(err) }, 'Redis unavailable during OAuth callback');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=server_error`);
    }

    if (!storedRaw) {
      app.log.warn({}, 'OAuth connect state validation failed: unknown or expired nonce');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
    }

    let stored: StoredConnectNonce;
    try {
      stored = JSON.parse(storedRaw);
    } catch {
      app.log.warn({}, 'OAuth connect state validation failed: corrupt nonce data');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
    }

    if (typeof stored.userId !== 'string' || !stored.userId) {
      app.log.warn({}, 'OAuth connect state validation failed: invalid stored nonce data');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=connect_failed`);
    }

    const userId = stored.userId;

    try {
      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: (process.env.GITHUB_CLIENT_ID || '').trim(),
          client_secret: (process.env.GITHUB_CLIENT_SECRET || '').trim(),
          code,
          redirect_uri: `${process.env.BACKEND_URL}/api/connect/github/callback`,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;

      if (tokenData.error) {
        app.log.error({ tokenError: tokenData.error }, 'GitHub connect token error');
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

      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?connected=github`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      app.log.error({ error, message }, 'GitHub connect error');
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/settings?error=server_error`);
    }
  });

  app.get('/github/autodiscover', {
    preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
    }],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const cacheKey = `github:autodiscover:${userId}`;

    if (app.redis) {
      try {
        const cached = await app.redis.get(cacheKey);
        if (cached) {
          try {
            return reply.send(JSON.parse(cached));
          } catch (err: unknown) {
            app.log.warn(`Redis cache parse failed for ${cacheKey}: ${getErrorMessage(err)}`);
          }
        }
      } catch (err: unknown) {
        app.log.warn(`Redis cache read failed for ${cacheKey}: ${getErrorMessage(err)}`);
      }
    }

    const oauthToken = await app.prisma.oAuthToken.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: GITHUB_FOLLOW_PLATFORM,
        },
      },
      select: { accessToken: true },
    });

    if (!oauthToken) {
      return reply.status(400).send({ error: 'Not connected to GitHub. Please connect GitHub first.', requiresAuth: true });
    }

    let accessToken: string;
    try {
      accessToken = decrypt(oauthToken.accessToken);
    } catch (err: unknown) {
      app.log.error({ err, userId }, 'GitHub follow token decrypt failed');
      return reply.status(500).send({ error: 'Failed to access GitHub connection' });
    }

    let response: Response;
    try {
      response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
    } catch (error: unknown) {
      app.log.error({ userId, error: getErrorMessage(error) }, 'GitHub autodiscovery failed');
      return reply.status(502).send({ error: 'Failed to fetch GitHub profile' });
    }

    if (response.status === 401) {
      if (app.redis) {
        void Promise.resolve(app.redis.del(cacheKey))
          .catch((err: unknown) => app.log.warn(`Redis cache delete failed for ${cacheKey}: ${getErrorMessage(err)}`));
      }
      return reply.status(401).send({ error: 'GitHub token expired or revoked', requiresAuth: true });
    }

    if (!response.ok) {
      const body = await response.text();
      app.log.error({ status: response.status, body, userId }, 'GitHub user API request failed');
      return reply.status(502).send({ error: 'Failed to fetch GitHub profile' });
    }

    const githubUser = await response.json() as { twitter_username?: string | null; blog?: string | null; company?: string | null; bio?: string | null; html_url?: string | null };
    const suggestions = buildGitHubDiscoverySuggestions(githubUser);

    if (app.redis) {
      void Promise.resolve(app.redis.set(cacheKey, JSON.stringify(suggestions), 'EX', GITHUB_AUTODISCOVER_CACHE_TTL))
        .catch((err: unknown) => app.log.warn(`Redis cache write failed for ${cacheKey}: ${getErrorMessage(err)}`));
    }

    return reply.send(suggestions);
  });


  // ─── Disconnect ───

  app.delete('/:platform', {
    preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
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
    } catch {
      return reply.status(404).send({ error: 'Connection not found' });
    }
  });
}

// State must be exactly 64 lowercase hex chars (32 random bytes).
// Returns null for any malformed input — caller must reject.
function parseNonce(state: string): string | null {
  if (!state) {
    return null;
  }
  if (!/^[0-9a-f]{64}$/.test(state)) {
    return null;
  }
  return state;
}

function buildGitHubDiscoverySuggestions(user: {
  twitter_username?: string | null;
  blog?: string | null;
  company?: string | null;
  bio?: string | null;
  html_url?: string | null;
}): Array<{ platform: string; username: string; confidence: 'high' | 'low' }> {
  const { twitter_username, blog } = user;

  const suggestions: Array<{ platform: string; username: string; confidence: 'high' | 'low' }> = [];

  if (twitter_username?.trim()) {
    suggestions.push({
      platform: 'twitter',
      username: twitter_username.trim(),
      confidence: 'high',
    });
  }

  if (blog) {
    const blogSuggestion = parseBlogSuggestion(blog);
    if (blogSuggestion) {
      suggestions.push(blogSuggestion);
    }
  }

  return suggestions;
}

function parseBlogSuggestion(blog: string): { platform: string; username: string; confidence: 'high' | 'low' } | null {
  const trimmed = blog.trim();
  if (!trimmed) {
    return null;
  }

  const url = parseBlogUrl(trimmed);
  if (!url) {
    return { platform: 'portfolio', username: trimmed, confidence: 'high' };
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const pathname = url.pathname.replace(/\/+$/, '');

  if (host === 'dev.to' && pathname.length > 1) {
    return { platform: 'devto', username: pathname.slice(1), confidence: 'low' };
  }

  if (host === 'hashnode.com' && pathname.startsWith('/@') && pathname.length > 2) {
    return { platform: 'hashnode', username: pathname.slice(2), confidence: 'low' };
  }

  if (host === 'npmjs.com' && pathname.startsWith('/~') && pathname.length > 2) {
    return { platform: 'npm', username: pathname.slice(2), confidence: 'low' };
  }

  return { platform: 'portfolio', username: url.href, confidence: 'high' };
}

function parseBlogUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}
