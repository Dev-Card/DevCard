import cookiePlugin from '@fastify/cookie';
import jwtPlugin from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { authRoutes } from '../routes/auth.js';
import { hashPassword } from '../utils/password.js';

import type { PrismaClient } from '@prisma/client';

const TEST_JWT_SECRET = 'test-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const mockUser = {
  id: 'user-123',
  email: 'ada@example.com',
  username: 'ada',
  displayName: 'Ada Lovelace',
};

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
  },
};

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cookiePlugin as any);
  await app.register(jwtPlugin as any, {
    secret: TEST_JWT_SECRET,
    cookie: { cookieName: 'access_Token', signed: false },
  });

  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: mockUser.id, username: mockUser.username };
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();

  return app;
}

describe('local auth routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'refresh-token-123' });
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('201 — creates a user with a hashed password and returns auth tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'ADA@EXAMPLE.COM',
          username: 'ada',
          displayName: 'Ada Lovelace',
          password: 'correct-horse-battery-staple',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        user: mockUser,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          email: 'ada@example.com',
          username: 'ada',
          displayName: 'Ada Lovelace',
          isActive: true,
          passwordHash: expect.stringMatching(/^scrypt:[0-9a-f]+:[0-9a-f]+$/),
        }),
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
        },
      }));
      expect(mockPrisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe('correct-horse-battery-staple');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledOnce();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('400 — rejects invalid input', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'not-an-email',
          username: 'a',
          displayName: '',
          password: 'short',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Validation failed');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('409 — rejects duplicate email addresses', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        email: 'ada@example.com',
        username: 'someone-else',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'ada@example.com',
          username: 'ada',
          displayName: 'Ada Lovelace',
          password: 'correct-horse-battery-staple',
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'Email already registered' });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    it('200 — authenticates a user and rotates session state', async () => {
      const passwordHash = await hashPassword('correct-horse-battery-staple');
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, lastSignInAt: new Date() });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'ADA@EXAMPLE.COM',
          password: 'correct-horse-battery-staple',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        user: mockUser,
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          passwordHash: true,
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockUser.id },
        data: expect.objectContaining({ isActive: true }),
      }));
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledOnce();
    });

    it('401 — rejects bad credentials', async () => {
      const passwordHash = await hashPassword('correct-horse-battery-staple');
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'ada@example.com',
          password: 'wrong-password',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'Invalid email or password' });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('401 — rejects OAuth-only accounts without password hashes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'ada@example.com',
          password: 'correct-horse-battery-staple',
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'Invalid email or password' });
    });
  });
});
