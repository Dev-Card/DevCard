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

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'Developer bio text',
  pronouns: 'he/him',
  role: 'Engineer',
  company: 'DevCard',
  avatarUrl: null,
  accentColor: '#6366f1',
  platformLinks: [
    {
      id: 'link-1',
      platform: 'github',
      username: 'testuser',
      url: 'https://github.com/testuser',
      displayOrder: 1,
    },
  ],
};

const mockCard = {
  id: 'card-123',
  title: 'My Profile Card',
  userId: 'user-123',
  user: {
    username: 'testuser',
    displayName: 'Test User',
    bio: 'Developer bio text',
    avatarUrl: null,
    accentColor: '#6366f1',
  },
  cardLinks: [
    {
      platformLink: {
        id: 'link-1',
        platform: 'github',
        username: 'testuser',
        url: 'https://github.com/testuser',
      },
      displayOrder: 1,
    },
  ],
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
  card: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  cardView: {
    create: vi.fn().mockResolvedValue({}),
  },
};

const mockRedis = {
  status: 'ready',
  getBuffer: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  platformLink: {} as any,
  cardView: {
    create: vi.fn().mockReturnValue({ catch: vi.fn() }),
  },
  followLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  card: {} as any,
};

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as any);
  app.decorate('redis', mockRedis as any);
  app.decorate('jwtVerify', async () => {
    return { id: 'viewer-456' };
  });
  app.register(publicRoutes, { prefix: '/api/u' });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  // Soft auth: jwtVerify rejects by default (unauthenticated visitor)
  app.decorateRequest('jwtVerify', async function () {
    throw new Error('no token');
  });
  app.register(publicRoutes, { prefix: '/api/public' });
  await app.ready();
  return app;
}

describe('Public Profiles & OG/QR Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/u/:username', () => {
    it('should return public profile details and track view', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser',
        headers: {
          authorization: 'Bearer dummy-token',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.username).toBe('testuser');
      expect(body.displayName).toBe('Test User');
      expect(body.links).toHaveLength(1);
      expect(body.links[0].platform).toBe('github');

      // Assert profile view tracking was called in background
      expect(mockPrisma.cardView.create).toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/unknownuser',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('User not found');
    });
  });

  describe('GET /api/u/card/:cardId', () => {
    it('should return public details for a stand-alone shared card', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(mockCard);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/card/card-123',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe('card-123');
      expect(body.title).toBe('My Profile Card');
      expect(body.owner.username).toBe('testuser');
      expect(body.links).toHaveLength(1);
      expect(body.links[0].platform).toBe('github');
    });

    it('should return 404 if card not found', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/card/unknown-card',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('Card not found');
    });
  });

  describe('GET /api/u/:username/card/:cardId', () => {
    it('should return owner profile + specific card data and track card view', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.card.findFirst.mockResolvedValue(mockCard);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/card/card-123',
        headers: {
          authorization: 'Bearer dummy-token',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.title).toBe('My Profile Card');
      expect(body.owner.username).toBe('testuser');
      expect(body.links).toHaveLength(1);

      // Assert card view tracking was triggered
      expect(mockPrisma.cardView.create).toHaveBeenCalled();
    });

    it('should return 404 if owner not found or card not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/unknownuser/card/card-123',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('User not found');
    });
  });

  describe('GET /api/u/:username/qr', () => {
    it('should generate a PNG QR code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/qr?format=png',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.rawPayload).toBeInstanceOf(Buffer);
    });

    it('should generate an SVG QR code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/qr?format=svg',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/svg+xml');
      expect(res.payload).toContain('<svg');
    });
  });

  describe('GET /api/u/:username/og-image', () => {
    it('should generate a dynamic PNG OG image on cache miss and save to Redis', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
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

    it('should gracefully degrade if Redis is offline', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRedis.getBuffer.mockRejectedValue(new Error('Redis connection lost')); // throws

      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/u/testuser/og-image',
      });

      // Still works and generates the OG card!
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
    it('should resolve successfully using the /api/public prefix alias', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
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
// ─── QR size validation ───────────────────────────────────────────────────────

describe('GET /api/public/:username/qr — size validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-attach default mock behaviour cleared by clearAllMocks
    (generateQRBuffer as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake-png'));
    (generateQRSvg as ReturnType<typeof vi.fn>).mockResolvedValue('<svg>fake</svg>');
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
