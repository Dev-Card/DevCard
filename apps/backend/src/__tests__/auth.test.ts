import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authRoutes } from '../routes/auth.js';

import type { PrismaClient } from '@prisma/client';

const mockUser = {
  id: 'user-123',
  username: 'octocat',
};

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  oAuthToken: {
    upsert: vi.fn(),
  },
};

function mobileState(redirectUri: string): string {
  const encodedRedirect = Buffer.from(redirectUri, 'utf8').toString('base64url');
  return `mobile_login.${encodedRedirect}.nonce`;
}

async function buildApp() {
  const app = Fastify();
  await app.register(jwt, { secret: 'test-secret' });
  await app.register(cookie);
  app.decorate('prisma', prismaMock as unknown as PrismaClient);
  app.decorate('authenticate', async () => {});
  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('auth mobile OAuth redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('BACKEND_URL', 'http://localhost:3000');
    vi.stubEnv('PUBLIC_APP_URL', 'http://localhost:5173');
    vi.stubEnv('MOBILE_REDIRECT_URI', 'devcard://auth/callback');
    vi.stubEnv('GITHUB_CLIENT_ID', 'github-client-id');
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'github-client-secret');
    vi.stubEnv('ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ access_token: 'github-token', scope: 'read:user' }),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          id: 123,
          login: 'octocat',
          email: 'octocat@example.com',
          name: 'Octo Cat',
          avatar_url: 'https://example.com/avatar.png',
          bio: null,
          company: null,
        }),
      }));
    prismaMock.user.upsert.mockResolvedValue(mockUser);
    prismaMock.oAuthToken.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('accepts an allowlisted mobile redirect URI', async () => {
    const state = mobileState('devcard://auth/callback');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/auth/github/callback?code=abc&state=${encodeURIComponent(state)}`,
      headers: { cookie: `oauth_state=${state}` },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/^devcard:\/\/auth\/callback#token=/);
    await app.close();
  });

  it('rejects an arbitrary https mobile redirect URI', async () => {
    const state = mobileState('https://evil.example/callback');
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/auth/github/callback?code=abc&state=${encodeURIComponent(state)}`,
      headers: { cookie: `oauth_state=${state}` },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Invalid mobile redirect URI' });
    expect(fetch).not.toHaveBeenCalled();
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejects a malformed mobile redirect URI', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/auth/github?state=mobile_login&mobile_redirect_uri=not-a-uri',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Invalid mobile redirect URI' });
    await app.close();
  });

  it('rejects an unknown mobile redirect scheme', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/auth/github?state=mobile_login&mobile_redirect_uri=evil://auth/callback',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Invalid mobile redirect URI' });
    await app.close();
  });

  it('preserves the existing web OAuth redirect flow', async () => {
    const state = 'web_state.nonce';
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: `/auth/github/callback?code=abc&state=${encodeURIComponent(state)}`,
      headers: { cookie: `oauth_state=${state}` },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/dashboard');
    await app.close();
  });
});
