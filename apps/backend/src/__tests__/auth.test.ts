import Fastify from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { authRoutes } from '../routes/auth';

import type { JWT } from '@fastify/jwt';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Redis } from 'ioredis';


const MOCK_CLIENT_ID = 'mock-github-client-id';
const MOCK_GOOGLE_CLIENT_ID = 'mock-google-client-id';
const MOCK_BACKEND_URL = 'http://localhost:3000';


async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(import('@fastify/cookie'));

  //as not testing this here
  app.decorate('authenticate', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.status(401).send({ error: 'Unauthorized' });
  });

  app.decorate('jwt', {
    sign: vi.fn().mockReturnValue('mock-token'),
    decode: vi.fn(),
    verify: vi.fn(),
  } as unknown as JWT);

  app.decorate('prisma', {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userIdentity: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  } as unknown as PrismaClient);

  app.decorate('redis', {
    set: vi.fn(),
    get: vi.fn(),
    getdel: vi.fn(),
  } as unknown as Redis);

  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

describe('Auth API — OAuth initiation', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('GITHUB_CLIENT_ID', MOCK_CLIENT_ID);
    vi.stubEnv('GOOGLE_CLIENT_ID', MOCK_GOOGLE_CLIENT_ID);
    vi.stubEnv('BACKEND_URL', MOCK_BACKEND_URL);
    vi.stubEnv('NODE_ENV', 'test');
    app = await buildApp(); //fresh app instance before and after each instance
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await app.close();  //fresh app instance before and after each instance
  });

  // /auth/github 
  describe('GET /auth/github — OAuth initiation', () => {
    it('302 — redirects to GitHub with valid query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/github',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('github.com/login/oauth/authorize');
    });

    it('302 — sets oauth_state cookie on redirect', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/github',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie']).toMatch(/oauth_state=/);
    });

    it('302 — accepts valid state param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/github?state=some-client-state',
      });

      expect(res.statusCode).toBe(302);
    });

    it('302 — accepts valid mobile_redirect_uri', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/github?mobile_redirect_uri=devcard://callback',
      });

      expect(res.statusCode).toBe(302);
    });

    it('400 — rejects invalid mobile_redirect_uri', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/github?mobile_redirect_uri=https://evil.com/callback',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: expect.any(String) });
    });

    it('400 — rejects mobile_redirect_uri that is not devcard:// scheme', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/github?mobile_redirect_uri=http://localhost/callback',
      });

      expect(res.statusCode).toBe(400);
    });

    it('400 — returns 400 when GITHUB_CLIENT_ID is missing', async () => {
      vi.stubEnv('GITHUB_CLIENT_ID', '');

      const res = await app.inject({
        method: 'GET',
        url: '/auth/github',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // /auth/google
  describe('GET /auth/google — OAuth initiation', () => {
    it('302 — redirects to Google with valid query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com/o/oauth2/v2/auth');
    });

    it('302 — sets oauth_state cookie on redirect', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google',
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie']).toMatch(/oauth_state=/);
    });

    it('302 — accepts valid state param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?state=some-client-state',
      });

      expect(res.statusCode).toBe(302);
    });

    it('302 — accepts valid mobile_redirect_uri', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?mobile_redirect_uri=devcard://callback',
      });

      expect(res.statusCode).toBe(302);
    });

    it('400 — rejects invalid mobile_redirect_uri', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?mobile_redirect_uri=https://evil.com/callback',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: expect.any(String) });
    });

    it('400 — rejects mobile_redirect_uri that is not devcard:// scheme', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/auth/google?mobile_redirect_uri=http://localhost/callback',
      });

      expect(res.statusCode).toBe(400);
    });

    it('400 — returns 400 when GOOGLE_CLIENT_ID is missing', async () => {
      vi.stubEnv('GOOGLE_CLIENT_ID', '');

      const res = await app.inject({
        method: 'GET',
        url: '/auth/google',
      });

      expect(res.statusCode).toBe(400);
    });
  });
});