import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { authRoutes } from '../routes/auth.js';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed:${password}`),
    compare: vi.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
  },
}));

const createdAt = new Date('2026-05-17T00:00:00.000Z');

const mockUser = {
  id: 'user-1',
  email: 'dev@example.com',
  username: 'devuser',
  displayName: 'Dev User',
  bio: null,
  pronouns: null,
  role: null,
  company: null,
  avatarUrl: null,
  accentColor: '#6366f1',
  provider: 'local',
  providerId: 'dev@example.com',
  passwordHash: 'hashed:password123',
  createdAt,
  updatedAt: createdAt,
};

const mockPrisma = {
  user: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
};

async function buildApp() {
  const app = Fastify();
  app.register(jwt, { secret: 'test-secret' });
  app.register(cookie);
  app.decorate('prisma', mockPrisma);
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
  app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('local auth routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers a user with a hashed password and returns a JWT', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: mockUser.id,
      email: mockUser.email,
      username: mockUser.username,
      displayName: mockUser.displayName,
      bio: null,
      pronouns: null,
      role: null,
      company: null,
      avatarUrl: null,
      accentColor: mockUser.accentColor,
      createdAt,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'Dev@Example.com',
        username: 'devuser',
        displayName: 'Dev User',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().token).toBeTruthy();
    expect(res.json().user.passwordHash).toBeUndefined();
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'dev@example.com',
        username: 'devuser',
        displayName: 'Dev User',
        provider: 'local',
        providerId: 'dev@example.com',
        passwordHash: 'hashed:password123',
      },
      select: expect.any(Object),
    });

    await app.close();
  });

  it('rejects duplicate emails during registration', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ email: 'dev@example.com', username: 'other' });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'dev@example.com',
        username: 'devuser',
        displayName: 'Dev User',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Email already registered');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();

    await app.close();
  });

  it('logs in a local user with valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'dev@example.com',
        password: 'password123',
      },
    });

    const body = res.json();
    expect(res.statusCode).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.user.provider).toBeUndefined();
    expect(body.user.providerId).toBeUndefined();

    await app.close();
  });

  it('rejects invalid login credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'dev@example.com',
        password: 'wrong-password',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Invalid email or password');

    await app.close();
  });

  it('protects authenticated routes with JWT middleware', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/auth/me' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Unauthorized');

    await app.close();
  });
});
