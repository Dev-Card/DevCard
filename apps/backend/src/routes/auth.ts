import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { encrypt } from '../utils/encryption.js';
import { buildOAuthState, getMobileRedirectUri } from '../services/authService.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface OAuthCallbackQuery {
  code: string;
  state?: string;
}

export async function authRoutes(app: FastifyInstance) {
  // Developer login bypass (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/dev-login', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await app.prisma.user.findUnique({ where: { username: 'devcard-demo' } });
      if (!user) {
        return reply.status(404).send({ error: 'Demo user not seeded' });
      }
      const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });
      return { token };
    });
  }

  // GitHub OAuth start
  app.get('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const redirectUri = `${process.env.BACKEND_URL}/auth/github/callback`;
    const clientState = (request.query as any).state || '';
    const mobileRedirectUri = (request.query as any).mobile_redirect_uri || '';
    const state = buildOAuthState(clientState, mobileRedirectUri);

    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    const params = new URLSearchParams({
      client_id: (process.env.GITHUB_CLIENT_ID || '').trim(),
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    const authUrl = `${GITHUB_AUTH_URL}?${params}`;
    app.log.debug({ provider: 'github' }, 'OAuth redirect initiated');
    return reply.redirect(authUrl);
  });

  // GitHub OAuth callback
  app.get('/github/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    const { code, state } = request.query;
    const storedState = (request.cookies as any)?.oauth_state;

    if (!state || !storedState || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid or missing OAuth state — possible CSRF attack' });
    }
    reply.clearCookie('oauth_state', { path: '/' });

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    try {
      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: (process.env.GITHUB_CLIENT_ID || '').trim(),
          client_secret: (process.env.GITHUB_CLIENT_SECRET || '').trim(),
          code,
          redirect_uri: `${process.env.BACKEND_URL}/auth/github/callback`,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (tokenData.error) {
        app.log.error({ tokenData }, 'GitHub token error');
        return reply.status(400).send({ error: 'Failed to authenticate with GitHub' });
      }

      const userRes = await fetch(GITHUB_USER_URL, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      const githubUser = (await userRes.json()) as any;

      let email = githubUser.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const emails = (await emailsRes.json()) as any[];
        const primary = emails.find((e: any) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email;
      }

      const user = await app.prisma.user.upsert({
        where: { provider_providerId: { provider: 'github', providerId: String(githubUser.id) } },
        update: {
          email: email || `${githubUser.login}@github.local`,
          displayName: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
        },
        create: {
          email: email || `${githubUser.login}@github.local`,
          username: githubUser.login,
          displayName: githubUser.name || githubUser.login,
          bio: githubUser.bio,
          company: githubUser.company,
          avatarUrl: githubUser.avatar_url,
          provider: 'github',
          providerId: String(githubUser.id),
        },
      });

      try {
        const encryptedToken = encrypt(tokenData.access_token);
        await app.prisma.oAuthToken.upsert({
          where: { userId_platform: { userId: user.id, platform: 'github' } },
          update: { accessToken: encryptedToken, scopes: 'read:user user:email' },
          create: { userId: user.id, platform: 'github', accessToken: encryptedToken, scopes: 'read:user user:email' },
        });
      } catch (err) {
        app.log.error({ err, userId: user.id }, 'Failed to persist GitHub OAuth token — authentication proceeds');
      }

      const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });

      if (request.query.state?.startsWith('mobile_')) {
        const mobileRedirect = getMobileRedirectUri(request.query.state) || process.env.MOBILE_REDIRECT_URI;
        return reply.redirect(`${mobileRedirect}#token=${token}`);
      }

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });

      return reply.redirect(`${process.env.PUBLIC_APP_URL}/dashboard`);
    } catch (error) {
      app.log.error({ error }, 'GitHub auth error');
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // Google OAuth start
  app.get('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const redirectUri = `${process.env.BACKEND_URL}/auth/google/callback`;
    const clientState = (request.query as any).state || '';
    const mobileRedirectUri = (request.query as any).mobile_redirect_uri || '';
    const state = buildOAuthState(clientState, mobileRedirectUri);

    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    const params = new URLSearchParams({
      client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params}`;
    app.log.debug({ provider: 'google' }, 'OAuth redirect initiated');
    return reply.redirect(authUrl);
  });

  // Google callback
  app.get('/google/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    const { code, state } = request.query;
    const storedState = (request.cookies as any)?.oauth_state;
    if (!state || !storedState || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid or missing OAuth state — possible CSRF attack' });
    }
    reply.clearCookie('oauth_state', { path: '/' });

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.BACKEND_URL}/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (tokenData.error) {
        app.log.error({ tokenData }, 'Google token error');
        return reply.status(400).send({ error: 'Failed to authenticate with Google' });
      }

      const userRes = await fetch(GOOGLE_USER_URL, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      const googleUser = (await userRes.json()) as any;

      const baseUsername = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');

      const user = await app.prisma.user.upsert({
        where: { provider_providerId: { provider: 'google', providerId: googleUser.id } },
        update: { email: googleUser.email, displayName: googleUser.name || baseUsername, avatarUrl: googleUser.picture },
        create: {
          email: googleUser.email,
          username: `${baseUsername}_${Date.now().toString(36)}`,
          displayName: googleUser.name || baseUsername,
          avatarUrl: googleUser.picture,
          provider: 'google',
          providerId: googleUser.id,
        },
      });

      const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });

      if (request.query.state?.startsWith('mobile_')) {
        const mobileRedirect = getMobileRedirectUri(request.query.state) || process.env.MOBILE_REDIRECT_URI;
        return reply.redirect(`${mobileRedirect}#token=${token}`);
      }

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });

      return reply.redirect(`${process.env.PUBLIC_APP_URL}/dashboard`);
    } catch (error) {
      app.log.error({ error }, 'Google auth error');
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // Current user
  app.get('/me', { preHandler: [async (request, reply) => {
      const server = request.server as any;
      if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
      if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
      try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
    }] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        pronouns: true,
        role: true,
        company: true,
        avatarUrl: true,
        accentColor: true,
        createdAt: true,
        oauthTokens: { select: { platform: true, scopes: true, createdAt: true } },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { oauthTokens, ...userData } = user;
    return { ...userData, connectedPlatforms: oauthTokens };
  });

  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('token', { path: '/' });
    return { message: 'Logged out' };
  });
}
