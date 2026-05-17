import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { publicRoutes } from '../routes/public.js';

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
};

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  cardView: {
    create: vi.fn(() => Promise.resolve({ id: 'view-1' })),
  },
};

async function buildApp() {
  const app = Fastify();
  await app.register(jwt, { secret: 'test-secret' });
  app.decorate('prisma', mockPrisma as any);
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
      expect.any(String)
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

    const decoded = app.jwt.verify(res.json().token) as any;
    expect(decoded.type).toBe('qr-session');
    expect(decoded.username).toBe('testuser');
    expect(decoded.profile.displayName).toBe('Test User');
    expect(decoded.exp - decoded.iat).toBe(600);
  });
});
