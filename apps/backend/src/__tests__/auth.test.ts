import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { authRoutes } from '../routes/auth.js';
import type { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.PUBLIC_APP_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.MOBILE_REDIRECT_URI = 'devcard://auth';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

const mockPrisma = {
  user: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  oAuthToken: {
    upsert: vi.fn(),
  },
};

global.fetch = vi.fn();

async function buildApp() {
  const app = Fastify();
  await app.register(jwt, { secret: 'test-secret' });
  await app.register(cookie);
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);

  app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('GET /auth/google/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists Google OAuthToken upon successful login', async () => {
    const mockUser = { id: 'user-123', username: 'testuser' };
    mockPrisma.user.upsert.mockResolvedValue(mockUser);
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    (global.fetch as any)
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          access_token: 'fake-google-token',
          scope: 'openid email profile',
        }),
      }) // tokenRes
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          id: 'google-id-123',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: 'https://avatar.com/test',
        }),
      }); // userRes

    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/auth/google/callback?code=fake-code&state=fake-state',
      cookies: {
        oauth_state: 'fake-state',
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/dashboard');

    // Verify user upsert
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider_providerId: { provider: 'google', providerId: 'google-id-123' } },
      })
    );

    // Verify oAuthToken upsert
    expect(mockPrisma.oAuthToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_platform: { userId: 'user-123', platform: 'google' } },
        create: expect.objectContaining({
          platform: 'google',
          scopes: 'openid email profile',
        }),
      })
    );
  });
});
