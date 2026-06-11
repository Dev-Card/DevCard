import cookiePlugin from '@fastify/cookie';
import jwtPlugin from '@fastify/jwt';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { authRoutes } from '../routes/auth.js';
import { extractRawJwt, blocklistKey } from '../utils/jwt.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // ≥ 32 chars
const USER_ID = 'user-test-001';
const USERNAME = 'testuser';

// ─── Mock Redis factory ───────────────────────────────────────────────────────

function createMockRedis(): { exists: Mock; set: Mock; del: Mock } {
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

  // cookie must be registered before jwt (required by @fastify/jwt when the
  // cookie option is used) so that request.cookies is populated before
  // jwtVerify() runs.
  //
  // Both plugins use `export =` (CJS-style) declarations. TypeScript resolves
  // the overloaded type as the namespace object rather than the callable
  // function when moduleResolution is "bundler", so `as any` narrows to the
  // call signature Fastify's register() actually expects at runtime.
  await app.register(cookiePlugin as any);
  // Real JWT plugin with cookie support — mirrors the production configuration
  // in app.ts so that both Authorization header and token cookie are accepted.
  await app.register(jwtPlugin as any, {
    secret: TEST_JWT_SECRET,
    cookie: { cookieName: 'token', signed: false },
  });

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
        } catch (redisErr) {
          app.log.warn({ err: redisErr }, 'Redis blocklist check failed — proceeding with JWT verification');
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

function bearerHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

// app.jwt is added by @fastify/jwt's module augmentation. The augmentation
// is not picked up by VS Code's language server under moduleResolution:"bundler"
// for `export =` packages, so all sign() calls go through this helper to keep
// the single cast in one place rather than scattering `(app as any)` everywhere.
function signToken(app: FastifyInstance, payload: object, options?: Record<string, unknown>): string {
  return (app as any).jwt.sign(payload, options);
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
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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

    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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

    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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

  it('401 — expired token is rejected and does not write to Redis', async () => {
    const realNow = Date.now();
    // Sign with 1-second expiry so we can advance the clock past it.
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: 1 });

    // Fake only the Date object (not timers) so jwtVerify sees the token as
    // expired without blocking the async inject pipeline.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(realNow + 2000);

    try {
      const res = await app.inject({
        method: 'DELETE',
        url: '/auth/logout',
        headers: bearerHeader(token),
      });
      // Authenticate preHandler rejects the expired token; handler never runs.
      expect(res.statusCode).toBe(401);
      expect(mockRedis.set).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('200 — works when JWT is sent via cookie (web browser flow)', async () => {
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: { Cookie: `token=${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ message: 'Logged out' });
    // Token extracted from cookie must still be blocklisted in Redis.
    expect(mockRedis.set).toHaveBeenCalledOnce();
    const [key] = mockRedis.set.mock.calls[0] as unknown as [string];
    expect(key).toBe(blocklistKey(token));
  });

  it('200 — Authorization header takes precedence over cookie when both are present', async () => {
    const headerToken = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });
    const cookieToken = signToken(app, { id: 'other-user', username: 'other' }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: {
        Authorization: `Bearer ${headerToken}`,
        Cookie: `token=${cookieToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    // The header token must be blocklisted — not the cookie token.
    expect(mockRedis.set).toHaveBeenCalledOnce();
    const [key] = mockRedis.set.mock.calls[0] as unknown as [string];
    expect(key).toBe(blocklistKey(headerToken));
    expect(key).not.toBe(blocklistKey(cookieToken));
  });

  it('200 — Set-Cookie response clears token with Path=/ and a past Expires date', async () => {
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(200);
    const raw = res.headers['set-cookie'] as string | string[];
    const cookieStr = Array.isArray(raw) ? raw.join('; ') : (raw ?? '');
    // Value must be emptied.
    expect(cookieStr).toMatch(/token=;/);
    // Path must be explicit so the browser clears the cookie on all routes.
    expect(cookieStr).toMatch(/Path=\//i);
    // Browser must be told to delete the cookie immediately.
    expect(cookieStr).toMatch(/Expires=|Max-Age=0/i);
  });

  it('200 — near-expiry token gets a short positive TTL in Redis', async () => {
    // Token that expires in 5 seconds — the blocklist TTL must still be positive.
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: 5 });

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(200);
    expect(mockRedis.set).toHaveBeenCalledOnce();
    const [, , , ttl] = mockRedis.set.mock.calls[0] as unknown as [string, string, string, number];
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(5);
  });

  it('200 — logs warning and skips Redis write when JWT has no exp claim', async () => {
    // Signing without expiresIn produces a token with no exp field.
    const token = signToken(app, { id: USER_ID, username: USERNAME });
    const warnMock = vi.fn();
    // Replace the logger's warn method so we can assert it was called.
    (app.log as any).warn = warnMock;

    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(200);
    expect(mockRedis.set).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledOnce();
    // Verify the message identifies the root cause clearly.
    const [, message] = warnMock.mock.calls[0] as [unknown, string];
    expect(message).toMatch(/missing exp/i);
  });

  it('401 — rejects "Authorization: Bearer " with no token value after the prefix', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: { Authorization: 'Bearer ' },
    });

    expect(res.statusCode).toBe(401);
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
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

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
    await wrongApp.register(jwtPlugin as any, { secret: 'totally-different-secret-xxxxx' });
    const badToken = signToken(wrongApp, { id: USER_ID });
    await wrongApp.close();

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(badToken),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');
  });

  it('200 — allows authenticated request when JWT is sent via cookie', async () => {
    mockRedis.exists.mockResolvedValue(0);
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Cookie: `token=${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    // Blocklist check must still run — the key is derived from the cookie token.
    expect(mockRedis.exists).toHaveBeenCalledOnce();
    expect(mockRedis.exists.mock.calls[0][0]).toBe(blocklistKey(token));
  });

  it('logs a warning when the Redis check throws and still allows valid JWT through', async () => {
    const warnMock = vi.fn();
    (app.log as any).warn = warnMock;
    mockRedis.exists.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(token),
    });

    expect(res.statusCode).toBe(200);
    expect(warnMock).toHaveBeenCalledOnce();
    const [obj, message] = warnMock.mock.calls[0] as [{ err: Error }, string];
    expect(message).toMatch(/blocklist check failed/i);
    expect(obj.err).toBeInstanceOf(Error);
  });

  it('401 — rejects "Authorization: Bearer " with no token value after the prefix', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Authorization: 'Bearer ' },
    });

    // extractRawJwt returns '' (falsy) — blocklist check is skipped,
    // jwtVerify receives an empty token and throws.
    expect(res.statusCode).toBe(401);
    expect(mockRedis.exists).not.toHaveBeenCalled();
  });
});

// ─── Revocation flow — end-to-end ────────────────────────────────────────────
//
// Verifies the full lifecycle: token works → logout blocklists it →
// authenticate rejects it. This is the critical security invariant.

describe('revocation flow — end-to-end', () => {
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

  it('token is usable before logout and rejected after blocklisting', async () => {
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    // Step 1: token is valid — protected route responds 200.
    const before = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(token),
    });
    expect(before.statusCode).toBe(200);

    // Step 2: logout succeeds and writes the key to the blocklist.
    const logout = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: bearerHeader(token),
    });
    expect(logout.statusCode).toBe(200);
    expect(mockRedis.set).toHaveBeenCalledOnce();

    // Step 3: simulate Redis now returning 1 for this token's blocklist key.
    // (In production this is automatic — the SET from step 2 persists in Redis.)
    mockRedis.exists.mockResolvedValueOnce(1);

    // Step 4: same token is now rejected by the authenticate middleware.
    const after = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: bearerHeader(token),
    });
    expect(after.statusCode).toBe(401);
    expect(after.json().error).toBe('Token has been revoked');
  });

  it('cookie-delivered token is also rejected after logout', async () => {
    const token = signToken(app, { id: USER_ID, username: USERNAME }, { expiresIn: '30d' });

    // Logout via cookie — browser clients never send an Authorization header.
    const logout = await app.inject({
      method: 'DELETE',
      url: '/auth/logout',
      headers: { Cookie: `token=${token}` },
    });
    expect(logout.statusCode).toBe(200);
    expect(mockRedis.set).toHaveBeenCalledOnce();
    // The blocklist key must match the token delivered via cookie.
    const [writtenKey] = mockRedis.set.mock.calls[0] as unknown as [string];
    expect(writtenKey).toBe(blocklistKey(token));

    // Simulate blocklist hit on next request.
    mockRedis.exists.mockResolvedValueOnce(1);

    const after = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Cookie: `token=${token}` },
    });
    expect(after.statusCode).toBe(401);
    expect(after.json().error).toBe('Token has been revoked');
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
  function makeRequest(overrides: Partial<{ authorization: string; cookies: Record<string, string> }>): FastifyRequest {
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

  it('returns null when Authorization is "Bearer " with no token after the space', () => {
    const req = makeRequest({ authorization: 'Bearer ' });
    // slice(7) || null normalises the empty string to null.
    expect(extractRawJwt(req)).toBeNull();
  });

  it('returns null when the token cookie value is empty', () => {
    const req = makeRequest({ cookies: { token: '' } });
    // || null normalises the empty string to null, matching the return type.
    expect(extractRawJwt(req)).toBeNull();
  });
});
