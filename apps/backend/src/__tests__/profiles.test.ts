import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { profileRoutes } from '../routes/profiles.js';
import type { PrismaClient } from '@prisma/client';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  bio: null,
  pronouns: null,
  role: null,
  company: null,
  avatarUrl: null,
  accentColor: '#ffffff',
  platformLinks: [],
  cards: [],
  provider: 'github',
  providerId: 'gh-123',
};

const mockPrisma: Pick<PrismaClient, 'user'> = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  } as unknown as PrismaClient['user'],
};

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-123' };
  });
  app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.ready();
  return app;
}

describe('GET /api/profiles/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return user profile with displayName', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/profiles/me' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.displayName).toBe('Test User');
    expect(body.email).toBe('test@example.com');
    expect(body.provider).toBeUndefined();
    expect(body.providerId).toBeUndefined();
  });

  it('should return 404 if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/profiles/me' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('User not found');
  });
});

describe('PUT /api/profiles/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update profile and return updated data', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, displayName: 'Updated Name' });
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { displayName: 'Updated Name' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe('Updated Name');
  });

  it('should return 400 for invalid accentColor', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { accentColor: 'notacolor' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Validation failed');
  });

  it('should return 409 if username is already taken', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'other-user' });
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { username: 'takenuser' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Username already taken');
  });
});