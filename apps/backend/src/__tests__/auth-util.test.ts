import cookiePlugin from '@fastify/cookie';
import jwtPlugin from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { authRoutes } from '../routes/auth.js';

async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(cookiePlugin as any);
  await app.register(jwtPlugin as any, { secret: 'test-secret-for-unit-tests-only' });

  app.decorate('prisma', {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn()
    }
  } as any);

  app.decorate('redis', {
    getdel: vi.fn(),
    set: vi.fn(),
    exists: vi.fn(),
  } as any);

  app.decorate('authenticate', async () => {});

  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('auth validation', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/mobile/exchange', () => {
    it('rejects missing code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/mobile/exchange',
        payload: {}
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Invalid request body');
    });

    it('rejects non-string code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/mobile/exchange',
        payload: { code: 123 }
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Invalid request body');
    });

    it('rejects empty code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/mobile/exchange',
        payload: { code: '' }
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Invalid request body');
    });
  });

  describe('POST /auth/refresh', () => {
    it('rejects empty refresh_token in body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refresh_token: '' }
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Invalid request body');
    });

    it('rejects non-string refresh_token in body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refresh_token: 123 }
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('Invalid request body');
    });
    
    it('fails when no token is provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh'
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe('Refresh token missing');
    });
  });
});
