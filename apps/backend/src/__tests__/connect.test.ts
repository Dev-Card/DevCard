import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { connectRoutes } from '../routes/connect.js';

import type { PrismaClient } from '@prisma/client';

const USER_ID = 'user-abc';
const VALID_NONCE = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const VALID_STATE = Buffer.from(JSON.stringify({ userId: USER_ID, nonce: VALID_NONCE })).toString('base64');
const ATTACKER_USER_ID = 'user-victim';
const CRAFTED_STATE = Buffer.from(JSON.stringify({ userId: ATTACKER_USER_ID, nonce: 'nonce-never-issued' })).toString('base64');

// Mock encrypt so the token-storage path does not throw in tests
vi.mock('../utils/encryption.js', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted_token'),
}));

const mockPrisma = {
  oAuthToken: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
};

// Redis mock that reports as connected and ready
const mockRedis = {
  status: 'ready',
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

// Redis mock that simulates connection failure
const mockRedisDown = {
  status: 'end',
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
};

async function buildApp(redisOverride?: object | null): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('redis', (redisOverride === undefined ? mockRedis : redisOverride) as any);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: USER_ID };
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: async () => ({ access_token: 'gh_token_abc', scope: 'user:follow' }),
  }));
  app.register(connectRoutes, { prefix: '/api/connect' });
  await app.ready();
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/connect/github/callback — CSRF nonce enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/connect/github/callback — CSRF nonce enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_APP_URL = 'https://app.devcard.test';
    process.env.BACKEND_URL = 'https://api.devcard.test';
    process.env.GITHUB_CLIENT_ID = 'gh_client_id';
    process.env.GITHUB_CLIENT_SECRET = 'gh_client_secret';
  });

  it('returns 503 when Redis is unavailable (status !== ready)', async () => {
    const app = await buildApp(mockRedisDown);
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${VALID_STATE}`,
    });

    expect(res.statusCode).toBe(503);
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
    expect(mockRedisDown.get).not.toHaveBeenCalled();
  });

  it('returns 503 when app.redis is null/falsy', async () => {
    const app = await buildApp(null);
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${VALID_STATE}`,
    });

    expect(res.statusCode).toBe(503);
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
  });

  it('redirects to invalid_state when nonce was never issued (crafted state)', async () => {
    mockRedis.get.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${CRAFTED_STATE}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=invalid_state');
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
  });

  it('redirects to invalid_state when nonce is present but userId does not match', async () => {
    mockRedis.get.mockResolvedValue('user-different');

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${VALID_STATE}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=invalid_state');
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
  });

  it('completes the OAuth flow and stores the token when nonce is valid', async () => {
    mockRedis.get.mockResolvedValue(USER_ID);
    mockRedis.del.mockResolvedValue(1);
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${VALID_STATE}`,
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('connected=github');
    expect(mockRedis.del).toHaveBeenCalledWith(`oauth:nonce:${VALID_NONCE}`);
    expect(mockPrisma.oAuthToken.upsert).toHaveBeenCalledOnce();
  });

  it('consumes the nonce exactly once — replay of the same state is rejected', async () => {
    mockRedis.get.mockResolvedValueOnce(USER_ID);
    mockRedis.del.mockResolvedValue(1);
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    const app = await buildApp();
    const first = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${VALID_STATE}`,
    });
    expect(first.statusCode).toBe(302);
    expect(first.headers.location).toContain('connected=github');

    mockRedis.get.mockResolvedValueOnce(null);
    const second = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=gh_code&state=${VALID_STATE}`,
    });
    expect(second.statusCode).toBe(302);
    expect(second.headers.location).toContain('error=invalid_state');
    expect(mockPrisma.oAuthToken.upsert).toHaveBeenCalledOnce();
  });

  it('redirects to connect_failed when code or state is missing', async () => {
    const app = await buildApp();

    const noCode = await app.inject({ method: 'GET', url: '/api/connect/github/callback?state=abc' });
    expect(noCode.statusCode).toBe(302);
    expect(noCode.headers.location).toContain('error=missing_params');

    const noState = await app.inject({ method: 'GET', url: '/api/connect/github/callback?code=abc' });
    expect(noState.statusCode).toBe(302);
    expect(noState.headers.location).toContain('error=missing_params');
  });

  it('redirects to connect_failed when state is not valid base64 JSON', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/callback?code=gh_code&state=not_valid_base64!!!',
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('error=connect_failed');
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
  });
});