import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { publicRoutes } from '../routes/public.js';
import type { PrismaClient } from '@prisma/client';

const mockPrisma = {
  usernameRedirect: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  cardView: {
    create: vi.fn().mockReturnValue({ catch: vi.fn() }),
  },
  followLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.register(publicRoutes, { prefix: '/api/public' });
  await app.ready();
  return app;
}

describe('Username Redirects Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs a 301 redirect to the new username for recently changed usernames', async () => {
    const app = buildApp();
    mockPrisma.usernameRedirect.findUnique.mockImplementation(({ where }: any) => {
      if (where.oldUsername === 'olduser') {
        return Promise.resolve({
          oldUsername: 'olduser',
          newUsername: 'newuser',
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });

    const appInstance = await app;
    const res = await appInstance.inject({
      method: 'GET',
      url: '/api/public/olduser',
    });

    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/api/public/newuser');
  });

  it('does not redirect and returns 404/200 if username is not in redirects', async () => {
    const app = buildApp();
    mockPrisma.usernameRedirect.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const appInstance = await app;
    const res = await appInstance.inject({
      method: 'GET',
      url: '/api/public/nonexistent',
    });

    expect(res.statusCode).toBe(404);
  });

  it('does not redirect if the redirect is older than 90 days', async () => {
    const app = buildApp();
    const ninetyOneDaysAgo = new Date();
    ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91);

    mockPrisma.usernameRedirect.findUnique.mockResolvedValue({
      oldUsername: 'olduser',
      newUsername: 'newuser',
      createdAt: ninetyOneDaysAgo,
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const appInstance = await app;
    const res = await appInstance.inject({
      method: 'GET',
      url: '/api/public/olduser',
    });

    expect(res.statusCode).toBe(404);
  });

  it('resolves multi-step redirect chains recursively', async () => {
    const app = buildApp();
    mockPrisma.usernameRedirect.findUnique.mockImplementation(({ where }: any) => {
      if (where.oldUsername === 'userA') {
        return Promise.resolve({
          oldUsername: 'userA',
          newUsername: 'userB',
          createdAt: new Date(),
        });
      }
      if (where.oldUsername === 'userB') {
        return Promise.resolve({
          oldUsername: 'userB',
          newUsername: 'userC',
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });

    const appInstance = await app;
    const res = await appInstance.inject({
      method: 'GET',
      url: '/api/public/userA/qr?size=300',
    });

    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/api/public/userC/qr?size=300');
  });

  it('guards against infinite loops in redirect chains', async () => {
    const app = buildApp();
    mockPrisma.usernameRedirect.findUnique.mockImplementation(({ where }: any) => {
      if (where.oldUsername === 'userA') {
        return Promise.resolve({
          oldUsername: 'userA',
          newUsername: 'userB',
          createdAt: new Date(),
        });
      }
      if (where.oldUsername === 'userB') {
        return Promise.resolve({
          oldUsername: 'userB',
          newUsername: 'userA',
          createdAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const appInstance = await app;
    const res = await appInstance.inject({
      method: 'GET',
      url: '/api/public/userA',
    });

    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('/api/public/userB');
  });
});
