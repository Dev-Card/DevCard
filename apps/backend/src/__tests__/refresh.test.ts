import cookiePlugin from '@fastify/cookie';
import jwtPlugin from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { authRoutes } from '../routes/auth.js';
import { hashRefreshToken } from '../utils/refreshToken.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const USER_ID = 'user-abc';
const USERNAME = 'testuser';
const FAMILY_ID = 'family-uuid-1234';

// A raw token value that the mock will recognise via its hash.
// The route hashes the cookie value with hashRefreshToken() before querying,
// so we store the hash in the mock and present the raw value in cookies.
const RAW_TOKEN_A = 'a'.repeat(128); // 128 hex chars = 64 random bytes
const RAW_TOKEN_B = 'b'.repeat(128);
const HASH_A = hashRefreshToken(RAW_TOKEN_A);
const HASH_B = hashRefreshToken(RAW_TOKEN_B);

const mockUser = {
  id: USER_ID,
  username: USERNAME,
  email: 'test@example.com',
};

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function createMockPrisma(): {
  user: { findUnique: ReturnType<typeof vi.fn> };
  refreshToken: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
} {
  return {
    user: { findUnique: vi.fn() },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

// ─── App factory ─────────────────────────────────────────────────────────────

async function buildApp(mockPrisma: MockPrisma): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cookiePlugin as any);
  await app.register(jwtPlugin as any, {
    secret: TEST_JWT_SECRET,
    cookie: { cookieName: 'access_Token', signed: false },
  });

  app.decorate('prisma', mockPrisma as any);
  app.decorate('redis', { set: vi.fn(), get: vi.fn(), getdel: vi.fn() } as any);
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

// ─── Helper — build a stored-token record ────────────────────────────────────

function makeStoredToken(overrides: Partial<{
  tokenHash: string;
  revokedAt: Date | null;
  expiresAt: Date;
  family: string;
}> = {}): {
  id: string;
  tokenHash: string;
  family: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  ip: string;
  userAgent: string;
  user: typeof mockUser;
} {
  return {
    id: 'token-id-1',
    tokenHash: HASH_A,
    family: FAMILY_ID,
    userId: USER_ID,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    ip: 'hashed-ip',
    userAgent: 'vitest',
    user: mockUser,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh — normal rotation
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/refresh — normal token rotation', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  it('rotates a valid token: revokes old, issues new, returns 200', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(makeStoredToken());
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const app = await buildApp(mockPrisma);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });

    expect(res.statusCode).toBe(200);

    // Old token must be revoked
    expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
    );

    // New token must be created in the same family
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ family: FAMILY_ID }),
      }),
    );

    // Family-wide revocation must NOT have been called on a clean rotation
    expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('returns 401 for a missing refresh token cookie', async () => {
    const app = await buildApp(mockPrisma);
    const res = await app.inject({ method: 'POST', url: '/auth/refresh' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Refresh token missing');
  });

  it('returns 401 for an unrecognised token hash', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    const app = await buildApp(mockPrisma);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Invalid refresh token');
  });

  it('returns 401 for an expired token without rotating', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(
      makeStoredToken({ expiresAt: new Date(Date.now() - 1000) }),
    );

    const app = await buildApp(mockPrisma);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Refresh token expired');
    expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh — reuse-detection & family revocation
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /auth/refresh — reuse-detection triggers family-wide revocation', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  it('revokes entire family when a previously-revoked token is presented', async () => {
    // Token A was already rotated (revokedAt is set).
    // Presenting it again is the theft signal.
    mockPrisma.refreshToken.findUnique.mockResolvedValue(
      makeStoredToken({ revokedAt: new Date(Date.now() - 5000) }),
    );
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    const app = await buildApp(mockPrisma);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Refresh token revoked');

    // Family-wide revocation must have fired
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledOnce();
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { family: FAMILY_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    // No new token must have been issued
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('does not issue a new token after family revocation', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(
      makeStoredToken({ revokedAt: new Date() }),
    );
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const app = await buildApp(mockPrisma);
    await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });

    expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rotation chain: A→B→C succeeds normally; presenting stale A kills B and C', async () => {
    // ── Step 1: legitimate client rotates A → B ──
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(makeStoredToken()); // A is live
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const app = await buildApp(mockPrisma);
    const step1 = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });
    expect(step1.statusCode).toBe(200);

    // ── Step 2: attacker presents stale token A ──
    // A is now revoked (stored with revokedAt); B is the live descendant.
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
      makeStoredToken({ revokedAt: new Date(Date.now() - 1000) }),
    );
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 }); // kills B

    const step2 = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });
    expect(step2.statusCode).toBe(401);
    expect(step2.json().error).toBe('Refresh token revoked');

    // Family kill must target only the still-live tokens in the family
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { family: FAMILY_ID, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });

    // ── Step 3: legitimate client now tries with B (now killed) → 401 ──
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(
      makeStoredToken({
        tokenHash: HASH_B,
        revokedAt: new Date(), // killed by step 2's updateMany
      }),
    );
    // On this third presentation the family is already all-revoked,
    // so updateMany returns count: 0 — still must be called.
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    const step3 = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_B },
    });
    expect(step3.statusCode).toBe(401);

    // No new token issued at any point after the theft was detected
    // (create was called once in step 1, never again)
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('returns 500 and does not issue a token if the family-revocation updateMany throws', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(
      makeStoredToken({ revokedAt: new Date() }),
    );
    mockPrisma.refreshToken.updateMany.mockRejectedValue(new Error('DB timeout'));

    const app = await buildApp(mockPrisma);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refresh_token: RAW_TOKEN_A },
    });

    expect(res.statusCode).toBe(500);
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});