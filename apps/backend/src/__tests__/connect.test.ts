import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { connectRoutes } from '../routes/connect.js';
import type { PrismaClient } from '@prisma/client';

process.env.PUBLIC_APP_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.MOBILE_REDIRECT_URI = 'devcard://connect';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockPrisma = {
  oAuthToken: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
};

global.fetch = vi.fn();

async function buildApp() {
  const app = Fastify();
  await app.register(jwt, { secret: 'test-secret' });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('redis', mockRedis as any);
  
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.register(connectRoutes, { prefix: '/api/connect' });
  await app.ready();
  return app;
}

describe('GET /api/connect/github/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects with missing_params if code or state is missing', async () => {
    const app = await buildApp();
    
    // Missing code
    let res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/callback?state=somestate',
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?error=missing_params');

    // Missing state
    res = await app.inject({
      method: 'GET',
      url: '/api/connect/github/callback?code=somecode',
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?error=missing_params');
  });

  it('redirects with connect_failed if state is invalid/malformed', async () => {
    const app = await buildApp();
    const invalidState = Buffer.from(JSON.stringify({ wrongKey: 'value' })).toString('base64');
    
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=testcode&state=${invalidState}`,
    });
    
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?error=connect_failed');
  });

  it('redirects with invalid_state if nonce is not found in Redis (CSRF/Expired)', async () => {
    mockRedis.get.mockResolvedValue(null);
    const app = await buildApp();
    const validState = Buffer.from(JSON.stringify({ userId: 'user-1', nonce: 'nonce-123' })).toString('base64');
    
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=testcode&state=${validState}`,
    });
    
    expect(mockRedis.get).toHaveBeenCalledWith('oauth:nonce:nonce-123');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?error=invalid_state');
  });

  it('redirects with invalid_state if Redis userId does not match state userId', async () => {
    mockRedis.get.mockResolvedValue('different-user-id');
    const app = await buildApp();
    const validState = Buffer.from(JSON.stringify({ userId: 'user-1', nonce: 'nonce-123' })).toString('base64');
    
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=testcode&state=${validState}`,
    });
    
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?error=invalid_state');
  });

  it('successfully exchanges code, upserts token, and redirects on valid flow (Web)', async () => {
    mockRedis.get.mockResolvedValue('user-1');
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ access_token: 'github-access-token', scope: 'user:follow' })
    });
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    const app = await buildApp();
    const validState = Buffer.from(JSON.stringify({ userId: 'user-1', nonce: 'web_nonce-123' })).toString('base64');
    
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=testcode&state=${validState}`,
    });
    
    // Nonce should be deleted immediately
    expect(mockRedis.del).toHaveBeenCalledWith('oauth:nonce:web_nonce-123');
    
    // Code exchange should be triggered
    expect(global.fetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('testcode')
    }));

    // Upsert should be called
    expect(mockPrisma.oAuthToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_platform: { userId: 'user-1', platform: 'github_follow' } }
    }));

    // Redirects to web success
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?connected=github');
  });

  it('redirects to mobile scheme if nonce starts with mobile_', async () => {
    mockRedis.get.mockResolvedValue('user-1');
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ access_token: 'github-access-token', scope: 'user:follow' })
    });
    mockPrisma.oAuthToken.upsert.mockResolvedValue({});

    const app = await buildApp();
    const validState = Buffer.from(JSON.stringify({ userId: 'user-1', nonce: 'mobile_nonce-123' })).toString('base64');
    
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=testcode&state=${validState}`,
    });
    
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('devcard://connect?connected=github');
  });

  it('redirects with connect_failed if token exchange returns an error', async () => {
    mockRedis.get.mockResolvedValue('user-1');
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: 'bad_verification_code' })
    });

    const app = await buildApp();
    const validState = Buffer.from(JSON.stringify({ userId: 'user-1', nonce: 'nonce-123' })).toString('base64');
    
    const res = await app.inject({
      method: 'GET',
      url: `/api/connect/github/callback?code=testcode&state=${validState}`,
    });
    
    expect(mockPrisma.oAuthToken.upsert).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:3000/settings?error=connect_failed');
  });
});