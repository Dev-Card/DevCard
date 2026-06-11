import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { authRoutes } from '../routes/auth.js';
import type { PrismaClient } from '@prisma/client';

const mockSafeUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  bio: null,
  pronouns: null,
  role: null,
  company: null,
  avatarUrl: null,
  accentColor: '#6366f1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  card: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(mockPrisma)),
};

async function buildApp() {
  const app = Fastify();
  await app.register(cookie);
  await app.register(jwt, { secret: 'test-secret-for-unit-tests-only' });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      const payload = await request.jwtVerify();
      request.user = payload;
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('email/password auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(mockPrisma));
  });

  it('registers a user, creates a default card, and returns a token', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockSafeUser);
    mockPrisma.card.create.mockResolvedValue({ id: 'card-123' });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'Test@Example.com',
        password: 'strong-password',
        username: 'testuser',
        displayName: 'Test User',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toEqual(expect.any(String));
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.passwordHash).toBeUndefined();
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'test@example.com',
        provider: 'password',
        passwordHash: expect.stringMatching(/^scrypt:/),
      }),
    }));
    expect(mockPrisma.card.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-123',
        title: 'Main DevCard',
        isDefault: true,
      }),
    }));
  });

  it('rejects duplicate usernames during signup', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ email: 'other@example.com', username: 'testuser' });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'strong-password',
        username: 'testuser',
        displayName: 'Test User',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('Username already taken');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockSafeUser);
    mockPrisma.card.create.mockResolvedValue({ id: 'card-123' });

    const app = await buildApp();
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'strong-password',
        username: 'testuser',
        displayName: 'Test User',
      },
    });
    const createdHash = mockPrisma.user.create.mock.calls[0][0].data.passwordHash;

    mockPrisma.user.findUnique.mockResolvedValue({ ...mockSafeUser, passwordHash: createdHash });

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'strong-password' },
    });

    expect(signup.statusCode).toBe(201);
    expect(login.statusCode).toBe(200);
    expect(login.json().token).toEqual(expect.any(String));
    expect(login.json().user.passwordHash).toBeUndefined();
  });

  it('rejects invalid login credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'wrong-password' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Invalid email or password');
  });
});
