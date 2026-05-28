import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { publicRoutes } from '../routes/public.js';

// Mock satori to avoid running heavy rendering in tests and dependency on font CDNs
vi.mock('satori', () => {
  return {
    default: vi.fn().mockResolvedValue('<svg>mock-svg</svg>'),
  };
});

// Mock resvg-js to return a simple mock PNG buffer
vi.mock('@resvg/resvg-js', () => {
  return {
    Resvg: class {
      render() {
        return {
          asPng() {
            return Buffer.from('mock-png-buffer');
          },
        };
      }
    },
  };
});

// Mock fonts loader to return mock buffers
vi.mock('../utils/fonts.js', () => {
  return {
    loadFonts: vi.fn().mockResolvedValue({
      regular: Buffer.from('regular font data'),
      bold: Buffer.from('bold font data'),
    }),
  };
});

// ── Mock QR utilities ─────────────────────────────────────────────────────────
vi.mock('../utils/qr.js', () => ({
  generateQRBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
  generateQRSvg: vi.fn().mockResolvedValue('<svg>fake</svg>'),
}));

// ── Shared mock fixtures ──────────────────────────────────────────────────────

const mockUserNoLinks = {
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

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  cardView: {
    create: vi.fn().mockResolvedValue({}),
  },
  followLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

const mockRedis = {
  status: 'ready',
  getBuffer: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
};

// ── App factory ───────────────────────────────────────────────────────────────

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as any);
  app.decorate('redis', mockRedis as any);
  // Soft auth: jwtVerify rejects by default (unauthenticated visitor)
  app.decorateRequest('jwtVerify', async function () {
    throw new Error('no token');
  });
  app.register(publicRoutes, { prefix: '/api/u' });
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

// ── Test suites ───────────────────────────────────────────────────────────────

describe('OG Image Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-attach default mock behaviour cleared by clearAllMocks
    (generateQRBuffer as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake-png'));
    (generateQRSvg as ReturnType<typeof vi.fn>).mockResolvedValue('<svg>fake</svg>');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  describe('GET /api/u/:username/og-image', () => {
    it('should generate a dynamic PNG OG image on cache miss and save to Redis', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserNoLinks);
      mockRedis.getBuffer.mockResolvedValue(null); // cache miss
      mockRedis.setex.mockResolvedValue('OK');

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/og-image',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload.toString()).toBe('mock-png-buffer');

      expect(mockRedis.getBuffer).toHaveBeenCalledWith('og:testuser');
      expect(mockRedis.setex).toHaveBeenCalledWith('og:testuser', 3600, expect.any(Buffer));
    });

    it('should return a cached PNG OG image on cache hit', async () => {
      mockRedis.getBuffer.mockResolvedValue(Buffer.from('cached-png-data')); // cache hit

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/og-image',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload.toString()).toBe('cached-png-data');

      // Served directly from cache, so Prisma findUnique shouldn't even be called
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should gracefully degrade if Redis cache fetch throws', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserNoLinks);
      mockRedis.getBuffer.mockRejectedValue(new Error('Redis connection lost'));

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/og-image',
      });

      // Still works and generates the OG card even without Redis
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload.toString()).toBe('mock-png-buffer');
    });

    it('should return 404 if user not found for OG image', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockRedis.getBuffer.mockResolvedValue(null);

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/unknownuser/og-image',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('User not found');
    });
  });

  describe('Alias /api/public verification', () => {
    it('should resolve OG image successfully using the /api/public prefix alias', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserNoLinks);
      mockRedis.getBuffer.mockResolvedValue(Buffer.from('cached-alias-data'));

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/public/testuser/og-image',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload.toString()).toBe('cached-alias-data');
    });
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
