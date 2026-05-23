import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { connectRoutes } from '../routes/connect.js';
import type { PrismaClient } from '@prisma/client';

// ── Shared test helpers ───────────────────────────────────────────────────────

/** Build a valid base64-encoded state string the way connect.ts does. */
function makeState(userId: string, nonce: string): string {
  return Buffer.from(JSON.stringify({ userId, nonce })).toString('base64');
}

/** Corrupt a valid base64 string so JSON.parse throws. */
function malformedBase64(): string {
  return 'not!!valid%%base64';
}

/** Valid base64 but wrong shape (missing required fields). */
function missingFieldState(): string {
  return Buffer.from(JSON.stringify({ bad: 'payload' })).toString('base64');
}

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../utils/encryption.js', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted-test-token'),
  decrypt: vi.fn().mockReturnValue('plain-test-token'),
}));

// ── Mock setup ────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc';
const NONCE   = 'a'.repeat(64); // 32 bytes hex

const mockPrisma = {
  oAuthToken: {
    findMany: vi.fn().mockResolvedValue([]),
    upsert:   vi.fn().mockResolvedValue({}),
    delete:   vi.fn().mockResolvedValue({}),
  },
} as unknown as PrismaClient;

// Redis mock: get/set/del are replaced per-test in beforeEach
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

// Capture fetch calls so we can assert token exchange never fires for bad state
const mockFetch = vi.fn();

async function buildApp() {
  const app = Fastify({ logger: false });

  app.decorate('prisma', mockPrisma);
  app.decorate('redis',  mockRedis);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: USER_ID };
  });

  // Expose jwtVerify on request so the route plugin doesn't blow up if it
  // tries to call it (it doesn't, but some Fastify internals reference it).
  app.decorateRequest('jwtVerify', async function () {
    return { id: USER_ID };
  });

  app.register(connectRoutes, { prefix: '/api/connect' });
  await app.ready();
  return app;
}

// Replace global fetch with our mock for every test
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).fetch = mockFetch;

  // Default Redis behaviours (override in individual tests)
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.get.mockResolvedValue(null);
  mockRedis.del.mockResolvedValue(1);

  // Default: GitHub returns a valid access token
  mockFetch.mockResolvedValue({
    json: async () => ({ access_token: 'ghs_test_token', scope: 'user:follow' }),
  });

  process.env.PUBLIC_APP_URL   = 'http://localhost:5173';
  process.env.BACKEND_URL      = 'http://localhost:3000';
  process.env.GITHUB_CLIENT_ID = 'test-client-id';
});

// ── GET /api/connect/github — initiation ─────────────────────────────────────

describe('GET /api/connect/github — nonce initiation', () => {
  it('persists a nonce in Redis before redirecting', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/connect/github' });

    expect(res.statusCode).toBe(302);
    expect(mockRedis.set).toHaveBeenCalledOnce();

    const [key, value, ex, ttl] = mockRedis.set.mock.calls[0];
    expect(key).toMatch(/^oauth:nonce:/);
    expect(value).toBe(USER_ID);
    expect(ex).toBe('EX');
    expect(ttl).toBe(600);
  });

  it('embeds the nonce in the state query param', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/connect/github' });

    const location = res.headers['location'] as string;
    const url      = new URL(location);
    const state    = JSON.parse(Buffer.from(url.searchParams.get('state')!, 'base64').toString());

    expect(state.userId).toBe(USER_ID);
    expect(typeof state.nonce).toBe('string');
    expect(state.nonce.length).toBeGreaterThan(0);

    // The nonce in the redirect must match what was stored in Redis
    const storedKey = mockRedis.set.mock.calls[0][0] as string;
    expect(storedKey).toBe(`oauth:nonce:${state.nonce}`);
  });

  it('fails closed with 500 when Redis is unavailable', async () => {
    mockRedis.set.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/connect/github' });

    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('Failed to initiate OAuth flow');
    // No redirect issued — attacker cannot initiate unprotected flow
    expect(res.headers['location']).toBeUndefined();
  });
});

// ── GET /api/connect/github/callback — validation ────────────────────────────

describe('GET /api/connect/github/callback — nonce validation', () => {

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('completes the connect flow for a valid nonce', async () => {
    mockRedis.get.mockResolvedValue(USER_ID); // nonce exists in Redis

    const app  = await buildApp();
    const res  = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${makeState(USER_ID, NONCE)}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('connected=github');

    // Token exchange happened
    expect(mockFetch).toHaveBeenCalledOnce();
    // Token was stored
    expect((mockPrisma.oAuthToken.upsert as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
  });

  it('consumes the nonce (deletes from Redis) after a successful flow', async () => {
    mockRedis.get.mockResolvedValue(USER_ID);

    const app = await buildApp();
    await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${makeState(USER_ID, NONCE)}`,
    });

    expect(mockRedis.del).toHaveBeenCalledWith(`oauth:nonce:${NONCE}`);
  });

  // ── Forged / unknown nonce ─────────────────────────────────────────────────

  it('rejects a forged state with an unknown nonce (Redis returns null)', async () => {
    mockRedis.get.mockResolvedValue(null); // nonce never persisted

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${makeState(USER_ID, 'forged-nonce')}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=connect_failed');

    // Token exchange must NOT fire for an unvalidated state
    expect(mockFetch).not.toHaveBeenCalled();
    expect((mockPrisma.oAuthToken.upsert as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // ── Replay attack ──────────────────────────────────────────────────────────

  it('blocks a replay of a previously consumed nonce', async () => {
    // First request: valid nonce is consumed
    mockRedis.get
      .mockResolvedValueOnce(USER_ID) // first call succeeds
      .mockResolvedValueOnce(null);    // second call: nonce gone

    const app   = await buildApp();
    const state = makeState(USER_ID, NONCE);

    const first  = await app.inject({ method: 'GET', url: `/api/connect/github/callback?code=code1&state=${state}` });
    const second = await app.inject({ method: 'GET', url: `/api/connect/github/callback?code=code2&state=${state}` });

    expect(first.statusCode).toBe(302);
    expect(first.headers['location']).toContain('connected=github');

    expect(second.statusCode).toBe(302);
    expect(second.headers['location']).toContain('error=connect_failed');

    // Fetch only fired for the first (valid) request
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  // ── userId mismatch ────────────────────────────────────────────────────────

  it('rejects a state where userId does not match the stored nonce owner', async () => {
    // Nonce was issued for USER_ID; attacker claims it belongs to another user
    mockRedis.get.mockResolvedValue(USER_ID);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${makeState('attacker-user-id', NONCE)}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=connect_failed');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Malformed inputs ───────────────────────────────────────────────────────

  it('rejects malformed base64 state gracefully', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${malformedBase64()}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=connect_failed');
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects valid base64 with a missing-field JSON payload', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${missingFieldState()}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=connect_failed');
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects requests with no state parameter', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    '/api/connect/github/callback?code=gh_code',
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=missing_params');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects requests with no code parameter', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?state=${makeState(USER_ID, NONCE)}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=missing_params');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Redis failures ─────────────────────────────────────────────────────────

  it('fails closed when Redis throws during nonce lookup', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('Redis connection lost'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=gh_code&state=${makeState(USER_ID, NONCE)}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=server_error');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Token exchange error ───────────────────────────────────────────────────

  it('redirects with connect_failed when GitHub rejects the code', async () => {
    mockRedis.get.mockResolvedValue(USER_ID);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ error: 'bad_verification_code' }),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url:    `/api/connect/github/callback?code=bad_code&state=${makeState(USER_ID, NONCE)}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toContain('error=connect_failed');
    expect((mockPrisma.oAuthToken.upsert as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});
