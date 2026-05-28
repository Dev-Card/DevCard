import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authRoutes } from '../routes/auth.js';

const githubUser = {
  id: 12345,
  login: 'octocat',
  email: 'octocat@example.com',
  name: 'Octo Cat',
  avatar_url: 'https://github.com/images/error/octocat_happy.gif',
};

function mockGitHubResponses(scope: string) {
  vi.mocked(fetch)
    .mockResolvedValueOnce({
      json: async () => ({ access_token: 'github-login-token', scope }),
    } as Response)
    .mockResolvedValueOnce({
      json: async () => githubUser,
    } as Response);
}

async function buildApp(existingToken: { scopes: string } | null) {
  const app = Fastify({ logger: false });
  const findUniqueToken = vi.fn().mockResolvedValue(existingToken);
  const upsertToken = vi.fn().mockResolvedValue({});
  const upsertUser = vi.fn().mockResolvedValue({
    id: 'user-1',
    username: githubUser.login,
  });
  const sign = vi.fn().mockReturnValue('jwt-token');

  app.decorate('prisma', {
    user: {
      upsert: upsertUser,
    },
    oAuthToken: {
      findUnique: findUniqueToken,
      upsert: upsertToken,
    },
  } as any);
  app.decorate('jwt', { sign } as any);
  app.decorate('encryption', {
    encrypt: vi.fn((token: string) => `encrypted:${token}`),
  } as any);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-1' };
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();

  return { app, findUniqueToken, upsertToken, upsertUser, sign };
}

describe('GitHub OAuth token persistence', () => {
  beforeEach(() => {
    process.env.BACKEND_URL = 'https://api.example.com';
    process.env.PUBLIC_APP_URL = 'https://app.example.com';
    process.env.MOBILE_REDIRECT_URI = 'devcard://auth';
    process.env.GITHUB_CLIENT_ID = 'github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'github-client-secret';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('preserves an existing follow-capable token when GitHub login returns reduced scopes', async () => {
    mockGitHubResponses('read:user,user:email');
    const { app, findUniqueToken, upsertToken, sign } = await buildApp({ scopes: 'user:follow read:user' });

    const response = await app.inject({
      method: 'GET',
      url: '/auth/github/callback?code=login-code&state=mobile_github',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('devcard://auth?token=jwt-token');
    expect(sign).toHaveBeenCalledWith(
      { id: 'user-1', username: githubUser.login },
      { expiresIn: '30d' }
    );
    expect(findUniqueToken).toHaveBeenCalledWith({
      where: { userId_platform: { userId: 'user-1', platform: 'github' } },
      select: { scopes: true },
    });
    expect(upsertToken).not.toHaveBeenCalled();

    await app.close();
  });

  it('stores a GitHub login token when no integration token exists', async () => {
    mockGitHubResponses('read:user,user:email');
    const { app, upsertToken } = await buildApp(null);

    const response = await app.inject({
      method: 'GET',
      url: '/auth/github/callback?code=login-code&state=mobile_github',
    });

    expect(response.statusCode).toBe(302);
    expect(upsertToken).toHaveBeenCalledWith({
      where: { userId_platform: { userId: 'user-1', platform: 'github' } },
      update: { accessToken: 'encrypted:github-login-token', scopes: 'read:user,user:email' },
      create: {
        userId: 'user-1',
        platform: 'github',
        accessToken: 'encrypted:github-login-token',
        scopes: 'read:user,user:email',
      },
    });

    await app.close();
  });

  it('allows a GitHub token replacement when the new token keeps follow scope', async () => {
    mockGitHubResponses('read:user,user:email,user:follow');
    const { app, upsertToken } = await buildApp({ scopes: 'read:user user:email' });

    const response = await app.inject({
      method: 'GET',
      url: '/auth/github/callback?code=login-code&state=mobile_github',
    });

    expect(response.statusCode).toBe(302);
    expect(upsertToken).toHaveBeenCalledWith({
      where: { userId_platform: { userId: 'user-1', platform: 'github' } },
      update: { accessToken: 'encrypted:github-login-token', scopes: 'read:user,user:email,user:follow' },
      create: {
        userId: 'user-1',
        platform: 'github',
        accessToken: 'encrypted:github-login-token',
        scopes: 'read:user,user:email,user:follow',
      },
    });

    await app.close();
  });
});
