import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { apiKeyPlugin } from '../plugins/apiKey.js';
import { v1Routes } from '../routes/v1.js';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  platformLink: {
    aggregate: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
};

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
};

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma);
  app.decorate('redis', mockRedis);
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: { title: 'DevCard Public API', version: '1.0.0' },
      servers: [{ url: 'http://localhost:3000/api/v1' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key',
          },
        },
      },
    },
    exposeRoute: false,
  });
  app.register(apiKeyPlugin);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-abc' };
  });
  app.register(v1Routes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('Public v1 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an API key and returns the raw secret once', async () => {
    mockPrisma.apiKey.create.mockResolvedValue({
      id: 'key-abc',
      userId: 'user-abc',
      label: 'test key',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastUsed: null,
      revokedAt: null,
    });

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/keys', payload: { label: 'test key' } });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe('key-abc');
    expect(body.label).toBe('test key');
    expect(typeof body.key).toBe('string');
    expect(body.key.startsWith('key-abc.')).toBe(true);
    expect(mockPrisma.apiKey.create).toHaveBeenCalled();
  });

  it('allows a valid API key to fetch authenticated profile data', async () => {
    const secret = 'my-secret-token';
    const hashValue = await bcrypt.hash(secret, 10);
    const apiKeyRecord = {
      id: 'auth-key',
      userId: 'user-abc',
      keyHash: hashValue,
      revokedAt: null,
    };

    mockPrisma.apiKey.findUnique.mockResolvedValue(apiKeyRecord);
    mockPrisma.apiKey.update.mockResolvedValue({ ...apiKeyRecord, lastUsed: new Date() });
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-abc',
      email: 'api@example.com',
      username: 'apiprofile',
      displayName: 'API User',
      bio: 'API bio',
      pronouns: 'they/them',
      role: 'developer',
      company: 'DevCard',
      avatarUrl: null,
      accentColor: '#ff0000',
      platformLinks: [],
      cards: [],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/me',
      headers: { authorization: `Bearer auth-key.${secret}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(expect.objectContaining({ username: 'apiprofile', email: 'api@example.com' }));
    expect(mockPrisma.apiKey.update).toHaveBeenCalled();
  });

  it('revokes an API key and rejects it on next request', async () => {
    const secret = 'revoked-secret';
    const hashValue = await bcrypt.hash(secret, 10);
    const currentKey = {
      id: 'revoked-key',
      userId: 'user-abc',
      keyHash: hashValue,
      revokedAt: null,
    };

    mockPrisma.apiKey.findUnique.mockImplementation(async ({ where }: any) => {
      if (where?.id === 'revoked-key') {
        return currentKey;
      }
      return null;
    });
    mockPrisma.apiKey.update.mockImplementation(async ({ where }: any) => ({ ...currentKey, ...where }));

    const app = await buildApp();
    const deleteRes = await app.inject({ method: 'DELETE', url: '/api/v1/keys/revoked-key' });

    expect(deleteRes.statusCode).toBe(204);
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({ where: { id: 'revoked-key' }, data: { revokedAt: expect.any(Date) } });

    mockPrisma.apiKey.findUnique.mockResolvedValue({ ...currentKey, revokedAt: new Date() });
    const fetchRes = await app.inject({
      method: 'GET',
      url: '/api/v1/profiles/me',
      headers: { authorization: `Bearer revoked-key.${secret}` },
    });

    expect(fetchRes.statusCode).toBe(401);
    expect(fetchRes.json().error).toBe('Unauthorized');
  });

  it('returns public profile data without an API key', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-xyz',
      username: 'publicuser',
      displayName: 'Public User',
      bio: 'Public bio',
      pronouns: null,
      role: null,
      company: null,
      avatarUrl: null,
      accentColor: '#000000',
      platformLinks: [],
      cards: [],
    });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/profiles/publicuser' });

    expect(res.statusCode).toBe(200);
    expect(res.json().username).toBe('publicuser');
  });

  it('serves OpenAPI JSON at /api/v1/openapi.json', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/openapi.json' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const body = res.json();
    expect(body.openapi).toBe('3.1.0');
    expect(body.paths['/profiles/me']).toBeDefined();
  });
});
