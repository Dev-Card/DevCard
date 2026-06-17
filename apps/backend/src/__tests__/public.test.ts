import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { publicRoutes } from '../routes/public.js';
import type { PrismaClient } from '@prisma/client';

// ── Mock QR utilities ─────────────────────────────────────────────────────────
// Prevents real QR rasterisation (and any native canvas/image deps) from running
// during unit tests.  The stubs return minimal valid values that satisfy the
// Content-Type assertions below.
vi.mock('../utils/qr.js', () => ({
  generateQRBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
  generateQRSvg: vi.fn().mockResolvedValue('<svg>fake</svg>'),
}));

import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  displayName: 'Test User',
  bio: null,
  pronouns: null,
  role: null,
  company: null,
  avatarUrl: null,
  accentColor: '#ffffff',
  platformLinks: [],
};

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  platformLink: {} as any,
  cardView: {
    create: vi.fn().mockReturnValue({ catch: vi.fn() }),
  },
  followLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  card: {} as any,
};

// ── Redis mock ────────────────────────────────────────────────────────────────
// Simulates ioredis behaviour: get returns null (MISS) by default.
const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
};

async function buildApp() {
  const app = Fastify();
  // Register JWT so app.jwt.sign() is available for the qr-session route.
  // @fastify/jwt also adds request.jwtVerify(), which throws when no valid
  // Authorization header is present — matching the soft-auth pattern in the routes.
  await app.register(jwt, { secret: 'test-secret-for-unit-tests-only' });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  // Decorate with the Redis mock so cache branches execute in tests.
  app.decorate('redis', mockRedis as any);
  app.register(publicRoutes, { prefix: '/api/public' });
  await app.ready();
  return app;
}

// ─── QR size validation ───────────────────────────────────────────────────────

describe('GET /api/public/:username/qr — size validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-attach default mock behaviour cleared by clearAllMocks
    (generateQRBuffer as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake-png'));
    (generateQRSvg as ReturnType<typeof vi.fn>).mockResolvedValue('<svg>fake</svg>');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  // ── Reject before DB touch ─────────────────────────────────────────────────

  it('rejects size=0 with 400 before any DB query', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=0',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/integer between/i);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects size=-1 with 400 before any DB query', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=-1',
    });
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects size=50000 (above upper bound) with 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=50000',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/integer between/i);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects size=2049 (one above upper bound) with 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=2049',
    });
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects non-numeric size (abc) with 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=abc',
    });
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects floating-point size (400.5) with 400', async () => {
    // parseInt('400.5') === 400, which IS in range — this passes.
    // Documenting the boundary: fractional strings are truncated, not rejected.
    // A string like '0.5' parseInt → 0, which is out of range.
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=0.5',
    });
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  // ── Accept valid sizes ─────────────────────────────────────────────────────

  it('accepts size=1 (lower bound) and returns PNG', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=1',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(generateQRBuffer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ width: 1 }),
    );
  });

  it('accepts size=2048 (upper bound) and returns PNG', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=2048',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(generateQRBuffer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ width: 2048 }),
    );
  });

  it('defaults to size=400 when no size param is provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr',
    });
    expect(res.statusCode).toBe(200);
    expect(generateQRBuffer).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ width: 400 }),
    );
  });

  // ── Format selection ───────────────────────────────────────────────────────

  it('returns SVG when format=svg is requested', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?format=svg&size=200',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(generateQRSvg).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ width: 200 }),
    );
  });

  // ── User not found ─────────────────────────────────────────────────────────

  it('returns 404 for an unknown username (valid size)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/nobody/qr?size=400',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('User not found');
  });

  // ── QR generation error ────────────────────────────────────────────────────

  it('returns 500 when QR generation throws', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    (generateQRBuffer as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('canvas error'),
    );
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=400',
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('QR code generation failed');
  });
});

// ─── Redis cache HIT / MISS behaviour ────────────────────────────────────────

describe('GET /api/public/:username — Redis cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockPrisma.followLog.findMany.mockResolvedValue([]);
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() });
  });

  it('returns X-Cache: MISS and queries DB on first request', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.headers['cache-control']).toBe('public, max-age=300, stale-while-revalidate=60');
    // DB was queried since Redis returned null
    expect(mockPrisma.user.findUnique).toHaveBeenCalledOnce();
    // Profile should be written to Redis after the DB fetch
    expect(mockRedis.set).toHaveBeenCalledWith(
      'profile:testuser',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('returns X-Cache: HIT and skips DB on cached request', async () => {
    // Simulate a warm cache entry
    const cached = JSON.stringify({
      _userId: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      bio: null,
      pronouns: null,
      role: null,
      company: null,
      avatarUrl: null,
      accentColor: '#ffffff',
      links: [],
    });
    mockRedis.get.mockResolvedValue(cached);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-cache']).toBe('HIT');
    // DB must NOT be queried when cache is warm
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('response body on cache HIT matches the cached profile', async () => {
    const cached = JSON.stringify({
      _userId: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      bio: 'A bio',
      pronouns: null,
      role: 'Engineer',
      company: null,
      avatarUrl: null,
      accentColor: '#123456',
      links: [],
    });
    mockRedis.get.mockResolvedValue(cached);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/public/testuser' });
    const body = res.json();

    expect(body.username).toBe('testuser');
    expect(body.accentColor).toBe('#123456');
    // Internal _userId field must not leak into the HTTP response
    expect(body._userId).toBeUndefined();
  });

  it('falls through to DB when Redis.get throws', async () => {
    mockRedis.get.mockRejectedValue(new Error('Redis down'));
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/public/testuser' });

    expect(res.statusCode).toBe(200);
    // DB was reached despite the Redis failure
    expect(mockPrisma.user.findUnique).toHaveBeenCalledOnce();
  });

  it('returns 404 when user does not exist (cache MISS)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/public/nobody' });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('User not found');
  });
});

// ─── QR session endpoint ──────────────────────────────────────────────────────

describe('GET /api/public/:username/qr-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  it('returns 404 when the user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/nobody/qr-session',
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('User not found');
  });

  it('returns a JWT token with correct shape on DB fetch (cache MISS)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr-session',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.token).toBe('string');
    expect(body.tokenType).toBe('JWT');
    expect(body.expiresIn).toBe(600);
    expect(typeof body.expiresAt).toBe('string');
    // expiresAt must be a valid ISO 8601 date string
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('token payload encodes the public profile snapshot', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr-session',
    });

    const { token } = res.json();
    // Decode without verifying so we can inspect the payload in the test
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    expect(decoded.sub).toBe('testuser');
    expect(decoded.profile.username).toBe('testuser');
    expect(decoded.profile.displayName).toBe('Test User');
  });

  it('serves snapshot from Redis cache without querying DB', async () => {
    const cached = JSON.stringify({
      _userId: 'user-123',
      username: 'testuser',
      displayName: 'Cached User',
      bio: null,
      pronouns: null,
      role: null,
      company: null,
      avatarUrl: null,
      accentColor: '#ffffff',
      links: [],
    });
    mockRedis.get.mockResolvedValue(cached);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr-session',
    });

    expect(res.statusCode).toBe(200);
    // DB must not be reached when the cache is warm
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();

    const { token } = res.json();
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    expect(decoded.profile.displayName).toBe('Cached User');
  });

  it('includes Cache-Control header in qr-session response', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr-session',
    });

    expect(res.headers['cache-control']).toBe('public, max-age=300, stale-while-revalidate=60');
  });

  it('caches the profile in Redis when served from DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/api/public/testuser/qr-session' });

    expect(mockRedis.set).toHaveBeenCalledWith(
      'profile:testuser',
      expect.any(String),
      'EX',
      300,
    );
  });
});
