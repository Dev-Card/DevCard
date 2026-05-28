import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
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
  app.register(publicRoutes, { prefix: '/api/public' });
  await app.ready();
  return app;
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('OG Image Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
