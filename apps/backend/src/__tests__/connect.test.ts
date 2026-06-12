import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectRoutes } from '../routes/connect.js';
import { encrypt } from '../utils/encryption.js';

process.env.PUBLIC_APP_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.MOBILE_REDIRECT_URI = 'devcard://connect';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

const VALID_NONCE = 'a'.repeat(64);
const USER_ID = 'user-1';

const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  getdel: vi.fn(),
  del: vi.fn(),
};

const mockPrisma = {
  oAuthToken: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
};

global.fetch = vi.fn();

async function buildApp(authenticatedUserId = USER_ID): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();
  app.decorate('redis', mockRedis as any);
  app.decorate('prisma', mockPrisma as any);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: authenticatedUserId };
  });
  app.register(connectRoutes, { prefix: '/api/connect' });
  await app.ready();
  return app;
}

describe('GET /api/connect/github', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores nonce in redis with userId and redirects to GitHub', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/connect/github' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize/);
    expect(mockRedis.set).toHaveBeenCalledOnce();

    const [key, value, , ttl] = mockRedis.set.mock.calls[0];
    expect(key).toMatch(/^oauth:connect-nonce:[0-9a-f]{64}$/);
    const stored = JSON.parse(value);
    expect(stored.userId).toBe(USER_ID);
    expect(ttl).toBe(600);

    const location = res.headers.location as string;
    const stateParam = new URL(location).searchParams.get('state');
    expect(key).toBe(`oauth:connect-nonce:${stateParam}`);
  });

  it('state param is 64 lowercase hex chars', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/connect/github' });
    const location = res.headers.location as string;
    const stateParam = new URL(location).searchParams.get('state');
    expect(stateParam).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('GET /api/connect/github/callback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valid flow: completes connect, writes github_follow token, redirects to settings', async () => {
    mockRedis.getdel.mockResolvedValue(JSON.stringify({ userId: USER_ID }));
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    (global.fetch as any).mockResolvedValue({
      json: async () => ({ access_token: 'gh-token', scope: 'user:follow' }),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${VALID_NONCE}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('connected=github');
    expect(mockRedis.getdel).toHaveBeenCalledWith(`oauth:connect-nonce:${VALID_NONCE}`);
    expect(mockPrisma.oAuthToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_platform: { userId: USER_ID, platform: 'github_follow' } },
      })
    );
  });

  it('missing code redirects with missing_params error', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?state=${VALID_NONCE}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=missing_params');
    expect(mockRedis.getdel).not.toHaveBeenCalled();
  });

  it('missing state redirects with missing_params error', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/callback?code=validcode',
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=missing_params');
    expect(mockRedis.getdel).not.toHaveBeenCalled();
  });

  it('malformed state (too short) redirects with connect_failed', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/callback?code=validcode&state=tooshort',
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
    expect(mockRedis.getdel).not.toHaveBeenCalled();
  });

  it('malformed state (non-hex chars) redirects with connect_failed', async () => {
    const app = await buildApp();
    const badState = 'z'.repeat(64);
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${badState}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
    expect(mockRedis.getdel).not.toHaveBeenCalled();
  });

  it('forged base64-JSON state is rejected as malformed', async () => {
    const app = await buildApp();
    const forgedState = Buffer.from(JSON.stringify({ userId: USER_ID, nonce: 'x'.repeat(32) })).toString('base64');
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${forgedState}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
    expect(mockRedis.getdel).not.toHaveBeenCalled();
  });

  it('unknown nonce (not in Redis) redirects with connect_failed', async () => {
    mockRedis.getdel.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${VALID_NONCE}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
  });

  it('expired nonce (Redis returns null) redirects with connect_failed', async () => {
    mockRedis.getdel.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${VALID_NONCE}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
  });

  it('forged state (random nonce not stored in Redis) redirects with connect_failed', async () => {
    mockRedis.getdel.mockResolvedValue(null);
    const forgedNonce = 'b'.repeat(64);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${forgedNonce}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
  });

  it('replay attack: second use of same nonce fails after first succeeds', async () => {
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    (global.fetch as any).mockResolvedValue({
      json: async () => ({ access_token: 'gh-token', scope: 'user:follow' }),
    });

    const app = await buildApp();

    // First call succeeds
    mockRedis.getdel.mockResolvedValueOnce(JSON.stringify({ userId: USER_ID }));
    const res1 = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code1&state=${VALID_NONCE}`,
    });
    expect(res1.statusCode).toBe(302);
    expect(res1.headers.location).toContain('connected=github');

    // Second call: nonce already consumed, Redis returns null
    mockRedis.getdel.mockResolvedValueOnce(null);
    const res2 = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code2&state=${VALID_NONCE}`,
    });
    expect(res2.statusCode).toBe(302);
    expect(res2.headers.location).toContain('error=connect_failed');
  });

  it('corrupt nonce data in Redis redirects with connect_failed', async () => {
    mockRedis.getdel.mockResolvedValue('not-valid-json{{{');
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${VALID_NONCE}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
  });

  it('Redis outage during callback redirects with server_error', async () => {
    mockRedis.getdel.mockRejectedValue(new Error('Redis unavailable'));
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=validcode&state=${VALID_NONCE}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=server_error');
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
  });

  it('GitHub token exchange failure redirects with connect_failed', async () => {
    mockRedis.getdel.mockResolvedValue(JSON.stringify({ userId: USER_ID }));

    (global.fetch as any).mockResolvedValue({
      json: async () => ({ error: 'bad_verification_code' }),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=badcode&state=${VALID_NONCE}`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
  });
});

describe('GET /api/connect/github/autodiscover', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns cached discovery suggestions when Redis stores the response', async () => {
    const cachedResponse = [{ platform: 'twitter', username: 'octocat', confidence: 'high' }];
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/autodiscover',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(cachedResponse);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns discovery suggestions and caches the result', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({ accessToken: encrypt('github-access-token') });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        twitter_username: 'octocat',
        blog: 'https://dev.to/octocat',
        company: 'GitHub',
        bio: 'Developer',
        html_url: 'https://github.com/octocat',
      }),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/autodiscover',
    });

    const expected = [
      { platform: 'twitter', username: 'octocat', confidence: 'high' },
      { platform: 'devto', username: 'octocat', confidence: 'low' },
    ];

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(expected);
    expect(mockRedis.set).toHaveBeenCalledWith(`github:autodiscover:${USER_ID}`, JSON.stringify(expected), 'EX', 3600);
  });

  it('returns unauthorized when GitHub API returns 401', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({ accessToken: encrypt('github-access-token') });
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Bad credentials'),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/autodiscover',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'GitHub token expired or revoked', requiresAuth: true });
    expect(mockRedis.del).toHaveBeenCalledWith(`github:autodiscover:${USER_ID}`);
  });

  it('returns an error when the GitHub follow token is missing', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.oAuthToken.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/autodiscover',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'Not connected to GitHub. Please connect GitHub first.', requiresAuth: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to live GitHub discovery when Redis read fails', async () => {
    mockRedis.get.mockRejectedValue(new Error('Redis unavailable'));
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({ accessToken: encrypt('github-access-token') });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        twitter_username: 'octocat',
        blog: 'https://npmjs.com/~octocat',
        company: 'GitHub',
        bio: 'Developer',
        html_url: 'https://github.com/octocat',
      }),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/autodiscover',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { platform: 'twitter', username: 'octocat', confidence: 'high' },
      { platform: 'npm', username: 'octocat', confidence: 'low' },
    ]);
    expect(global.fetch).toHaveBeenCalled();
  });
});
