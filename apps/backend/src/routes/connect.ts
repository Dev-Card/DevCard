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

interface OAuthCallbackQuery {
  code: string;
  state?: string;
}

interface ParsedOAuthState {
  userId: string;
  nonce: string;
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
      if (app.redis) {
        await app.redis.del(`oauth:nonce:${decodedState.nonce}`);
      }

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

function generateState(): string {
  return randomBytes(32).toString('hex');
}
