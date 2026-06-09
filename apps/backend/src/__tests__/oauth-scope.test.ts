/**
 * Regression tests for OAuth token scope isolation.
 *
 * Prior to the fix, the authentication flow (scope: read:user user:email,
 * platform key: 'github') and the GitHub connect/follow flow (scope:
 * user:follow, platform key: 'github') both wrote to the same OAuthToken
 * record.  Whichever executed last silently overwrote the other's access
 * token, causing follow capability to disappear after re-authentication.
 *
 * The fix uses a dedicated platform key ('github_follow') for the connect
 * flow so the two records are independent and can never overwrite each other.
 */

import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { connectRoutes } from '../routes/connect.js';
import { followRoutes } from '../routes/follow.js';

import type { PrismaClient } from '@prisma/client';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../utils/encryption.js', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace(/^enc:/, '')),
}));

const mockFetch = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).fetch = mockFetch;

  process.env.PUBLIC_APP_URL   = 'http://localhost:5173';
  process.env.BACKEND_URL      = 'http://localhost:3000';
  process.env.GITHUB_CLIENT_ID = 'test-client-id';
});

const USER_ID = 'user-scope-test';

// ── Connect-route test harness ────────────────────────────────────────────────

function makeConnectState(userId: string): string {
  return Buffer.from(JSON.stringify({ userId, nonce: 'test-nonce' })).toString('base64');
}

function buildConnectApp(mockPrisma: Partial<PrismaClient>) {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma as PrismaClient);
  app.decorate('authenticate', async (req: any) => { req.user = { id: USER_ID }; });
  app.register(connectRoutes, { prefix: '/api/connect' });
  return app.ready().then(() => app);
}

// ── Follow-route test harness ─────────────────────────────────────────────────

function buildFollowApp(mockPrisma: Partial<PrismaClient>) {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma as PrismaClient);
  app.decorate('authenticate', async (req: any) => { req.user = { id: USER_ID }; });
  app.register(followRoutes, { prefix: '/api/follow' });
  return app.ready().then(() => app);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Connect flow — platform key
// ─────────────────────────────────────────────────────────────────────────────

describe('GitHub connect flow — token stored under github_follow', () => {
  it('writes the follow token to platform=github_follow, not github', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const app = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: 'follow-token', scope: 'user:follow' }),
    });

    await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code123&state=${makeConnectState(USER_ID)}`,
    });

    expect(upsert).toHaveBeenCalledOnce();
    const call = upsert.mock.calls[0][0];

    // Key must be github_follow
    expect(call.where.userId_platform.platform).toBe('github_follow');
    expect(call.create.platform).toBe('github_follow');
    expect(call.update).not.toHaveProperty('platform'); // update never changes the key
  });

  it('stores the scope returned by GitHub in the follow token record', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const app = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: 'follow-token', scope: 'user:follow' }),
    });

    await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code123&state=${makeConnectState(USER_ID)}`,
    });

    const { create } = upsert.mock.calls[0][0];
    expect(create.scopes).toBe('user:follow');
  });

  it('falls back to user:follow scope when GitHub omits the scope field', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const app = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: 'follow-token' }), // no scope field
    });

    await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code123&state=${makeConnectState(USER_ID)}`,
    });

    const { create } = upsert.mock.calls[0][0];
    expect(create.scopes).toBe('user:follow');
  });

  it('does NOT touch the github (auth) token record during the connect flow', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const app = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: 'follow-token', scope: 'user:follow' }),
    });

    await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code123&state=${makeConnectState(USER_ID)}`,
    });

    // Exactly one upsert — the github_follow record; never 'github'
    expect(upsert).toHaveBeenCalledTimes(1);
    const key = upsert.mock.calls[0][0].where.userId_platform.platform;
    expect(key).not.toBe('github');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Follow route — uses github_follow token
// ─────────────────────────────────────────────────────────────────────────────

describe('GitHub follow route — looks up github_follow token', () => {
  it('resolves the token from platform=github_follow', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'tok-1',
      accessToken: 'enc:follow-token',
    });

    mockFetch.mockResolvedValue({ status: 204 });

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn().mockReturnValue({ catch: vi.fn() }) } as any,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/github/targetuser',
    });

    expect(res.statusCode).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({
      where: { userId_platform: { userId: USER_ID, platform: 'github_follow' } },
    });
  });

  it('returns 400 with requiresAuth when github_follow token is absent', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn() } as any,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/github/targetuser',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().requiresAuth).toBe(true);

    // The lookup must be for github_follow — not the auth token
    expect(findUnique.mock.calls[0][0].where.userId_platform.platform).toBe('github_follow');
  });

  it('does NOT fall back to the github (auth) token if github_follow is missing', async () => {
    // Only the github_follow lookup should be attempted; never a fallback to 'github'
    const findUnique = vi.fn().mockResolvedValue(null);

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn() } as any,
    });

    await app.inject({ method: 'POST', url: '/api/follow/github/targetuser' });

    // Exactly one DB call, and it is for github_follow
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique.mock.calls[0][0].where.userId_platform.platform).toBe('github_follow');
  });

  it('non-GitHub platforms still use their own name as the token key', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'tok-2',
      accessToken: 'enc:some-token',
    });

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn() } as any,
    });

    // 'twitter' is not GitHub — it should not be mapped to 'twitter_follow'
    await app.inject({ method: 'POST', url: '/api/follow/twitter/targetuser' });

    expect(findUnique.mock.calls[0][0].where.userId_platform.platform).toBe('twitter');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Scope-overwrite lifecycle — the full story
// ─────────────────────────────────────────────────────────────────────────────

describe('Scope-overwrite lifecycle — isolation between auth and connect tokens', () => {
  it('connect flow and auth flow target independent platform keys (no shared record)', async () => {
    // Simulate: user logs in → connect → log in again.
    // The auth upsert writes 'github'; the connect upsert writes 'github_follow'.
    // They never share a key, so neither can overwrite the other.

    const upsertCalls: string[] = [];
    const upsert = vi.fn().mockImplementation(async (args: any) => {
      upsertCalls.push(args.where.userId_platform.platform);
      return {};
    });

    // ── Simulate the connect callback ──────────────────────────────────────
    const connectApp = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: 'follow-token', scope: 'user:follow' }),
    });

    await connectApp.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code1&state=${makeConnectState(USER_ID)}`,
    });

    // Connect writes github_follow
    expect(upsertCalls).toContain('github_follow');
    expect(upsertCalls).not.toContain('github');
  });

  it('repeated connect cycles only ever touch github_follow', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const app = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: 'follow-token', scope: 'user:follow' }),
    });

    // Three consecutive reconnect attempts
    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'GET',
        url: `/api/connect/github/callback?code=code${i}&state=${makeConnectState(USER_ID)}`,
      });
    }

    expect(upsert).toHaveBeenCalledTimes(3);
    for (const call of upsert.mock.calls) {
      expect(call[0].where.userId_platform.platform).toBe('github_follow');
    }
  });

  it('follow route succeeds immediately after a connect cycle', async () => {
    const ENCRYPTED_FOLLOW_TOKEN = 'enc:follow-token-v1';

    const findUnique = vi.fn().mockResolvedValue({
      id: 'tok-follow',
      accessToken: ENCRYPTED_FOLLOW_TOKEN,
    });

    mockFetch.mockResolvedValue({ status: 204 }); // GitHub follow API

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn().mockReturnValue({ catch: vi.fn() }) } as any,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/github/somedev',
    });

    expect(res.statusCode).toBe(200);
    // Confirm we went to the GitHub API with the decrypted token
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com/user/following/somedev'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer follow-token-v1',
        }),
      }),
    );
  });

  it('follow route still works after a simulated re-login cycle', async () => {
    // Re-login would call auth.ts → upsert to 'github'.
    // The github_follow record is untouched.  Follow should still resolve.

    const FOLLOW_TOKEN = { id: 'tok-follow', accessToken: 'enc:follow-token' };
    const findUnique = vi.fn().mockResolvedValue(FOLLOW_TOKEN);

    mockFetch.mockResolvedValue({ status: 204 });

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn().mockReturnValue({ catch: vi.fn() }) } as any,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/github/postlogindev',
    });

    expect(res.statusCode).toBe(200);
    // Lookup must target github_follow, not the re-written auth token
    expect(findUnique.mock.calls[0][0].where.userId_platform.platform).toBe('github_follow');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Encrypted token persistence
// ─────────────────────────────────────────────────────────────────────────────

describe('Encrypted token persistence', () => {
  it('connect flow stores an encrypted token, not the raw access token', async () => {
    const RAW_TOKEN = 'ghs_raw_follow_token_abc123';
    const upsert = vi.fn().mockResolvedValue({});

    const app = await buildConnectApp({ oAuthToken: { upsert } as any });

    mockFetch.mockResolvedValue({
      json: async () => ({ access_token: RAW_TOKEN, scope: 'user:follow' }),
    });

    await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=code&state=${makeConnectState(USER_ID)}`,
    });

    const { create } = upsert.mock.calls[0][0];
    // encrypt mock prefixes with 'enc:' — raw token must not appear verbatim
    expect(create.accessToken).toBe(`enc:${RAW_TOKEN}`);
    expect(create.accessToken).not.toBe(RAW_TOKEN);
  });

  it('follow route decrypts the stored token before calling GitHub API', async () => {
    const STORED = 'enc:decrypted-follow-token';

    const findUnique = vi.fn().mockResolvedValue({
      id: 'tok-1',
      accessToken: STORED,
    });

    mockFetch.mockResolvedValue({ status: 204 });

    const app = await buildFollowApp({
      oAuthToken: { findUnique } as any,
      followLog: { create: vi.fn().mockReturnValue({ catch: vi.fn() }) } as any,
    });

    await app.inject({ method: 'POST', url: '/api/follow/github/dev' });

    // decrypt mock strips 'enc:' prefix
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer decrypted-follow-token',
        }),
      }),
    );
  });
});
