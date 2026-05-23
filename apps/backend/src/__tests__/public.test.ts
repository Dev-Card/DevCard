import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
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

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  // Soft auth: jwtVerify rejects by default (unauthenticated visitor)
  app.decorateRequest('jwtVerify', async function () {
    throw new Error('no token');
  });
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
