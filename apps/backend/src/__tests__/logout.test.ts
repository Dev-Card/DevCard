import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwtPlugin from '@fastify/jwt';
import cookiePlugin from '@fastify/cookie';

import { authRoutes } from '../routes/auth.js';
import { extractRawJwt, blocklistKey } from '../utils/jwt.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // ≥ 32 chars
const USER_ID = 'user-test-001';
const USERNAME = 'testuser';

// ─── Mock Redis factory ───────────────────────────────────────────────────────

function createMockRedis() {
  return {
    exists: vi.fn().mockResolvedValue(0),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  };
}

type MockRedis = ReturnType<typeof createMockRedis>;

// ─── App factory ─────────────────────────────────────────────────────────────
//
// Builds an isolated Fastify instance that mirrors the production authenticate
// decorator (blocklist check → jwtVerify) without needing a real database or
// Redis server. All dependencies are replaced with vitest mocks.

async function buildTestApp(mockRedis: MockRedis): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Real JWT plugin — lets us sign and verify actual tokens in tests.
  await app.register(jwtPlugin, { secret: TEST_JWT_SECRET });
  // Real cookie plugin — needed by extractRawJwt's cookie fallback path.
  await app.register(cookiePlugin);

  // Minimal Prisma stub. The logout route does not touch the database, but
  // authRoutes also registers /dev-login and /auth/me which reference
  // app.prisma at request time (never reached by these tests).
  app.decorate('prisma', {
    user: { findUnique: vi.fn().mockResolvedValue(null) },
  } as any);

  // Mock Redis — injected so the authenticate decorator and logout handler
  // can interact with it without a real Redis server.
  app.decorate('redis', mockRedis as any);

  // Authenticate decorator — mirrors production logic in app.ts:
  // 1. Extract raw JWT.
  // 2. Check blocklist in Redis (inner try/catch — Redis failure is non-fatal).
  // 3. Call jwtVerify() (outer try/catch — invalid JWT → 401).
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      const raw = extractRawJwt(request);
      if (raw) {
        try {
          const revoked = await mockRedis.exists(blocklistKey(raw));
          if (revoked) {
            return reply.status(401).send({ error: 'Token has been revoked' });
          }
        } catch {
          // Redis failure — fail open, proceed to jwtVerify
        }
      }
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  await app.register(authRoutes, { prefix: '/auth' });

  // Generic protected route — used to test the authenticate middleware
  // independently of the logout handler.
  app.get('/protected', {
    preHandler: [(app as any).authenticate],
  }, async () => ({ ok: true }));

  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bearerHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ─── DELETE /auth/logout ──────────────────────────────────────────────────────

describe('DELETE /auth/logout', () => {
  let app: FastifyInstance;
  let mockRedis: MockRedis;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    app = await buildTestApp(mockRedis);
  });

  afterEach(async () => {
    await app.close();
  });

  it('200 — returns logged-out message and clears the token cookie', async () => {
    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: 'Logged out' });

    // Cookie must be cleared — Set-Cookie header should zero the token value.
    const setCookie = res.headers['set-cookie'] as string | string[];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieStr).toMatch(/token=;/);
  });

  it('blocks the token in Redis with a positive TTL', async () => {
    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    expect(mockRedis.set).toHaveBeenCalledOnce();

    const [key, value, exFlag, ttl] = mockRedis.set.mock.calls[0] as unknown as [string, string, string, number];
    expect(key).toBe(blocklistKey(token));
    expect(value).toBe('1');
    expect(exFlag).toBe('EX');
    // TTL should be close to 30 days in seconds (allow 60s of test execution slack).
    expect(ttl).toBeGreaterThan(30 * 24 * 60 * 60 - 60);
    expect(ttl).toBeLessThanOrEqual(30 * 24 * 60 * 60);
  });

  it('uses the correct blocklist key derived from the token signature', async () => {
    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    const [key] = mockRedis.set.mock.calls[0] as unknown as [string];
    expect(key).toBe(blocklistKey(token));
    // Key must be a deterministic sha256 hash, never the raw JWT.
    expect(key).toMatch(/^blocklist:[0-9a-f]{64}$/);
    expect(key).not.toContain(token);
  });

  it('401 — rejects request with no token (unauthenticated)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
    });

    expect(res.statusCode).toBe(401);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('401 — rejects request with a malformed token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader('not.a.valid.jwt'),
    });

    expect(res.statusCode).toBe(401);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('still returns 200 if Redis write fails (non-fatal)', async () => {
    mockRedis.set.mockRejectedValueOnce(new Error('Redis connection lost'));

    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    // Logout must succeed even when Redis is down — cookie is still cleared.
    expect(res.statusCode).toBe(200);
  });

  it('401 — rejects a second logout attempt with an already-revoked token', async () => {
    // After the first logout the token is in the blocklist (exists returns 1).
    mockRedis.exists.mockResolvedValue(1);

    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    // The authenticate preHandler catches the revoked token before the handler runs.
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Token has been revoked');
    // Redis write must NOT be called — handler never ran.
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});

// ─── authenticate middleware — blocklist behaviour ────────────────────────────

describe('authenticate middleware', () => {
  let app: FastifyInstance;
  let mockRedis: MockRedis;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedis = createMockRedis();
    app = await buildTestApp(mockRedis);
  });

  afterEach(async () => {
    await app.close();
  });

  it('200 — allows a valid non-revoked token', async () => {
    mockRedis.exists.mockResolvedValue(0);
    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockRedis.exists).toHaveBeenCalledOnce();
    expect(mockRedis.exists.mock.calls[0][0]).toBe(blocklistKey(token));
  });

  it('401 — rejects a revoked token with "Token has been revoked"', async () => {
    mockRedis.exists.mockResolvedValue(1); // token is in the blocklist
    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Token has been revoked');
  });

  it('200 — continues to allow access when Redis check throws (fail-open)', async () => {
    mockRedis.exists.mockRejectedValueOnce(new Error('Redis timeout'));
    const token = app.jwt.sign({ id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(token),
    });

    // Redis failure must not cause a false 401 — JWT expiry is still the guard.
    expect(res.statusCode).toBe(200);
  });

  it('401 — rejects a malformed token with "Unauthorized"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader('not-a-jwt'),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('401 — rejects a request with no token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(res.statusCode).toBe(401);
    expect(mockRedis.exists).not.toHaveBeenCalled();
  });

  it('401 — rejects a token signed with the wrong secret', async () => {
    // Sign with a different secret — jwtVerify will fail.
    const wrongApp = Fastify({ logger: false });
    await wrongApp.register(jwtPlugin, { secret: 'totally-different-secret-xxxxx' });
    const badToken = wrongApp.jwt.sign({ id: USER_ID });
    await wrongApp.close();

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(badToken),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });
});

// ─── blocklistKey utility ─────────────────────────────────────────────────────

describe('blocklistKey', () => {
  it('produces a consistent key for the same token', () => {
    const token = 'header.payload.signature';
    expect(blocklistKey(token)).toBe(blocklistKey(token));
  });

  it('produces different keys for different signatures', () => {
    expect(blocklistKey('h.p.sig1')).not.toBe(blocklistKey('h.p.sig2'));
  });

  it('always starts with "blocklist:" followed by 64 hex chars', () => {
    const key = blocklistKey('h.p.anysignature');
    expect(key).toMatch(/^blocklist:[0-9a-f]{64}$/);
  });

  it('produces the same key regardless of header or payload content', () => {
    // Two tokens with different claims but the same signature produce the same key.
    // (Unlikely in practice, but documents the hash-of-signature contract.)
    const key1 = blocklistKey('differentHeader.differentPayload.SAME_SIG');
    const key2 = blocklistKey('anotherHeader.anotherPayload.SAME_SIG');
    expect(key1).toBe(key2);
  });
});

// ─── extractRawJwt utility ────────────────────────────────────────────────────

describe('extractRawJwt', () => {
  function makeRequest(overrides: Partial<{ authorization: string; cookies: Record<string, string> }>) {
    return {
      headers: { authorization: overrides.authorization },
      cookies: overrides.cookies ?? {},
    } as any;
  }

  it('returns token from Authorization: Bearer header', () => {
    const req = makeRequest({ authorization: 'Bearer my.jwt.token' });
    expect(extractRawJwt(req)).toBe('my.jwt.token');
  });

  it('returns token from cookie when no Authorization header', () => {
    const req = makeRequest({ cookies: { token: 'cookie.jwt.token' } });
    expect(extractRawJwt(req)).toBe('cookie.jwt.token');
  });

  it('prefers Authorization header over cookie', () => {
    const req = makeRequest({
      authorization: 'Bearer header.jwt.token',
      cookies: { token: 'cookie.jwt.token' },
    });
    expect(extractRawJwt(req)).toBe('header.jwt.token');
  });

  it('returns null when neither header nor cookie is present', () => {
    const req = makeRequest({});
    expect(extractRawJwt(req)).toBeNull();
  });

  it('returns null when Authorization header is not Bearer', () => {
    const req = makeRequest({ authorization: 'Basic dXNlcjpwYXNz' });
    expect(extractRawJwt(req)).toBeNull();
  });
});
