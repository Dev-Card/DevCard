import { Prisma, type PrismaClient } from '@prisma/client';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { profileRoutes } from '../routes/profiles.js';

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

const mockUserFindUnique = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn();
const mockPlatformLinkAggregate = vi.fn();
const mockPlatformLinkCreate = vi.fn();
const mockPlatformLinkFindFirst = vi.fn();
const mockPlatformLinkUpdate = vi.fn();
const mockPlatformLinkDelete = vi.fn();

const mockPrisma = {
  user: {
    findUnique: mockUserFindUnique,
    findFirst: mockUserFindFirst,
    update: mockUserUpdate,
  },
  platformLink: {
    aggregate: mockPlatformLinkAggregate,
    create: mockPlatformLinkCreate,
    findFirst: mockPlatformLinkFindFirst,
    update: mockPlatformLinkUpdate,
    delete: mockPlatformLinkDelete,
  },
};

async function buildApp():Promise<FastifyInstance> {
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
    mockUserFindUnique.mockResolvedValue(mockUser);
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
    mockUserFindUnique.mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/profiles/me' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('User not found');
  });
});

describe('PUT /api/profiles/me', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update profile and return updated data', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue({ ...mockUser, displayName: 'Updated Name' });
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
    mockUserFindFirst.mockResolvedValue({ id: 'other-user' });
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { username: 'takenuser' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Username already taken');
  });

  it('should return 409 when a concurrent request wins the unique constraint race (P2002)', async () => {
    // Both requests pass the findFirst check; the DB unique constraint fires on
    // the losing write — Prisma raises P2002.
    mockUserFindFirst.mockResolvedValue(null);
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    mockUserUpdate.mockRejectedValue(p2002);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { username: 'raced-username' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Username already taken');
  });

  it('should return 500 for unexpected database errors during update', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    mockUserUpdate.mockRejectedValue(new Error('Connection refused'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { username: 'anyuser' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe('Internal server error');
  });

  it('should not call findFirst when no username is provided in the update', async () => {
    mockUserUpdate.mockResolvedValue({ ...mockUser, displayName: 'New Name' });
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me',
      payload: { displayName: 'New Name' },
    });

    expect(res.statusCode).toBe(200);
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });
});

describe('Platform link routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 400 for invalid link create body', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: '', username: '' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Validation failed');
    expect(mockPlatformLinkCreate).not.toHaveBeenCalled();
  });

  it('should create a platform link with a valid body', async () => {
    const createdLink = {
      id: 'link-123',
      userId: 'user-123',
      platform: 'github',
      username: 'octocat',
      url: 'https://github.com/octocat',
      displayOrder: 2,
    };

    mockPlatformLinkAggregate.mockResolvedValue({ _max: { displayOrder: 1 } });
    mockPlatformLinkCreate.mockResolvedValue(createdLink);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'octocat' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(createdLink);
    expect(mockPlatformLinkAggregate).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      _max: { displayOrder: true },
    });
    expect(mockPlatformLinkCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        platform: 'github',
        username: 'octocat',
        url: expect.stringContaining('octocat'),
        displayOrder: 2,
      },
    });
  });

  it('should return 404 when updating a link that does not exist', async () => {
    mockPlatformLinkFindFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/link-404',
      payload: { platform: 'github', username: 'octocat' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Link not found');
    expect(mockPlatformLinkFindFirst).toHaveBeenCalledWith({
      where: { id: 'link-404', userId: 'user-123' },
    });
    expect(mockPlatformLinkUpdate).not.toHaveBeenCalled();
  });

  it('should delete an existing platform link', async () => {
    mockPlatformLinkFindFirst.mockResolvedValue({
      id: 'link-123',
      userId: 'user-123',
      platform: 'github',
      username: 'octocat',
      url: 'https://github.com/octocat',
      displayOrder: 0,
    });
    mockPlatformLinkDelete.mockResolvedValue({ id: 'link-123' });

    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/me/links/link-123',
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(mockPlatformLinkFindFirst).toHaveBeenCalledWith({
      where: { id: 'link-123', userId: 'user-123' },
    });
    expect(mockPlatformLinkDelete).toHaveBeenCalledWith({ where: { id: 'link-123' } });
  });
});
