import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authRoutes } from '../routes/auth.js';

import type { PrismaClient } from '@prisma/client';

const mockUser = {
  id: 'user-123',
  username: 'devcard-demo',
};

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
};

async function buildApp(nodeEnv: string) {
  vi.stubEnv('NODE_ENV', nodeEnv);

  const app = Fastify();
  await app.register(jwt, { secret: 'test-secret' });
  await app.register(cookie);
  app.decorate('prisma', prismaMock as unknown as PrismaClient);
  app.decorate('authenticate', async () => {});
  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('auth dev-login route registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers /auth/dev-login outside production', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    const app = await buildApp('development');

    const res = await app.inject({
      method: 'POST',
      url: '/auth/dev-login',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('token');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'devcard-demo' },
    });

    await app.close();
  });

  it('does not register /auth/dev-login in production', async () => {
    const app = await buildApp('production');

    const res = await app.inject({
      method: 'POST',
      url: '/auth/dev-login',
    });

    expect(res.statusCode).toBe(404);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();

    await app.close();
  });

  it('keeps other auth routes registered in production', async () => {
    const app = await buildApp('production');

    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ message: 'Logged out' });

    await app.close();
  });
});
