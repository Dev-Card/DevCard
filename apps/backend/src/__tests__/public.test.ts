import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { publicRoutes } from '../routes/public.js';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

import type { PrismaClient } from '@prisma/client';


vi.mock('../utils/qr.js', () => ({
  generateQRBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-png')),
  generateQRSvg: vi.fn().mockResolvedValue('<svg>fake</svg>'),
}));

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'Building things',
  pronouns: null,
  role: 'Engineer',
  company: 'DevCard',
  avatarUrl: null,
  accentColor: '#ffffff',
  platformLinks: [
    {
      id: 'link-1',
      platform: 'github',
      username: 'testuser',
      url: 'https://github.com/testuser',
      displayOrder: 0,
    },
  ],
};

const redisStore = new Map<string, string>();

const mockRedis = {
  get: vi.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
  setex: vi.fn((key: string, _ttl: number, value: string) => {
    redisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  del: vi.fn((...keys: string[]) => {
    keys.forEach((key) => redisStore.delete(key));
    return Promise.resolve(keys.length);
  }),
};

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  cardView: {
    create: vi.fn(() => Promise.resolve({ id: 'view-1' })),
  },
  followLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  card: {} as PrismaClient['card'],
};

async function buildApp() {
  const app = Fastify();
  await app.register(jwt, { secret: 'test-secret' });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('redis', mockRedis as any);
  app.register(publicRoutes, { prefix: '/api/public' });
  await app.ready();
  return app;
}

describe('GET /api/public/:username', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
  });

  it('should cache profile data after a MISS and serve repeat requests as HIT', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();

    const miss = await app.inject({ method: 'GET', url: '/api/public/testuser' });
    expect(miss.statusCode).toBe(200);
    expect(miss.headers['x-cache']).toBe('MISS');
    expect(miss.headers['cache-control']).toBe('public, max-age=300, stale-while-revalidate=60');
    expect(miss.json().displayName).toBe('Test User');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(mockRedis.setex).toHaveBeenCalledWith(
      'profile:testuser',
      300,
      expect.any(String),
    );

    const hit = await app.inject({ method: 'GET', url: '/api/public/testuser' });
    expect(hit.statusCode).toBe(200);
    expect(hit.headers['x-cache']).toBe('HIT');
    expect(hit.json().links[0].platform).toBe('github');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('should return 404 without caching when the user is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/public/missing' });

    expect(res.statusCode).toBe(404);
    expect(mockRedis.setex).not.toHaveBeenCalled();
  });
});

describe('GET /api/public/:username/qr-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
  });

  it('should return an offline-decodable signed token containing the profile snapshot', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/public/testuser/qr-session' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(res.json().expiresIn).toBe(600);
    expect(res.json().tokenType).toBe('JWT');

    const decoded = app.jwt.verify(res.json().token) as {
      type: string;
      username: string;
      profile: { displayName: string };
      exp: number;
      iat: number;
    };
    expect(decoded.type).toBe('qr-session');
    expect(decoded.username).toBe('testuser');
    expect(decoded.profile.displayName).toBe('Test User');
    expect(decoded.exp - decoded.iat).toBe(600);
  });
});

describe('GET /api/public/:username/qr — size validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateQRBuffer as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake-png'));
    (generateQRSvg as ReturnType<typeof vi.fn>).mockResolvedValue('<svg>fake</svg>');
  });

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

  it('rejects fractional size string (0.5) with 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/testuser/qr?size=0.5',
    });
    expect(res.statusCode).toBe(400);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

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
