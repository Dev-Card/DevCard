import crypto from 'node:crypto';

import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { webhookRoutes } from '../routes/webhooks.js';
import { signPayload } from '../utils/webhookDispatch.js';
// ─── Mock Encryption ───
// We mock encryption so tests don't need the ENCRYPTION_KEY env var.
vi.mock('../utils/encryption.js', () => ({
  encrypt: (plaintext: string) => `encrypted:${plaintext}`,
  decrypt: (encrypted: string) => encrypted.replace('encrypted:', ''),
}));

// ─── Mock Prisma ───

const mockEndpoint = {
  id: 'wh-1',
  userId: 'user-123',
  url: 'https://example.com/webhook',
  secret: 'encrypted:abc123',
  events: ['card.viewed'],
  isActive: true,
  createdAt: new Date(),
};

const mockDelivery = {
  id: 'del-1',
  endpointId: 'wh-1',
  eventType: 'card.viewed',
  payload: { event: 'card.viewed' },
  status: 'success',
  responseCode: 200,
  attempts: 1,
  nextRetryAt: null,
  createdAt: new Date(),
};
  const mockPrisma = {
  $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockPrisma)),
  webhookEndpoint: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  webhookDelivery: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// ─── App Builder ───

async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as any);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-123' };
  });
  app.register(webhookRoutes, { prefix: '/api/webhooks' });
  await app.ready();
  return app;
}

// ─── Tests ───

describe('POST /api/webhooks — register endpoint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create a webhook endpoint and return plaintext secret', async () => {
    mockPrisma.webhookEndpoint.count.mockResolvedValue(0);
    mockPrisma.webhookEndpoint.create.mockResolvedValue({
      ...mockEndpoint,
      id: 'new-wh',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks',
      payload: {
        url: 'https://example.com/webhook',
        events: ['card.viewed'],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBe('new-wh');
    expect(body.secret).toBeDefined();
    expect(typeof body.secret).toBe('string');
    expect(body.secret.length).toBeGreaterThan(0);
  });

  it('should reject when max 5 endpoints reached', async () => {
    mockPrisma.webhookEndpoint.count.mockResolvedValue(5);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks',
      payload: {
        url: 'https://example.com/webhook',
        events: ['card.viewed'],
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('Maximum');
  });

  it('should return 400 for invalid URL', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks',
      payload: {
        url: 'not-a-url',
        events: ['card.viewed'],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for empty events array', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks',
      payload: {
        url: 'https://example.com/webhook',
        events: [],
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/webhooks — list endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return user endpoints without secrets', async () => {
    const { secret: _secret, ...endpointWithoutSecret } = mockEndpoint;
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([endpointWithoutSecret]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/webhooks',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).not.toHaveProperty('secret');
  });
});

describe('DELETE /api/webhooks/:id — remove endpoint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete an owned endpoint', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(mockEndpoint);
    mockPrisma.webhookEndpoint.delete.mockResolvedValue(mockEndpoint);

    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/webhooks/wh-1',
    });

    expect(res.statusCode).toBe(204);
  });

  it('should return 404 for non-existent endpoint', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/webhooks/non-existent',
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/webhooks/:id/deliveries — delivery logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return paginated deliveries', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(mockEndpoint);
    mockPrisma.webhookDelivery.findMany.mockResolvedValue([mockDelivery]);
    mockPrisma.webhookDelivery.count.mockResolvedValue(1);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/webhooks/wh-1/deliveries?page=1&limit=10',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
    expect(body.pagination.page).toBe(1);
  });

  it('should return 404 if endpoint not owned by user', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/webhooks/other-wh/deliveries',
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/webhooks/:id/rotate-secret', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should rotate the secret and return new plaintext', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(mockEndpoint);
    mockPrisma.webhookEndpoint.update.mockResolvedValue(mockEndpoint);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/webhooks/wh-1/rotate-secret',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.secret).toBeDefined();
    expect(typeof body.secret).toBe('string');
    expect(body.secret.length).toBe(64); // 32 bytes hex
    expect(body.message).toContain('rotated');
  });

  it('should return 404 for non-owned endpoint', async () => {
    mockPrisma.webhookEndpoint.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/webhooks/other-wh/rotate-secret',
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('signPayload — HMAC-SHA256 signature', () => {
  it('should produce a valid HMAC-SHA256 hex signature', () => {
    const secret = 'test-secret';
    const payload = JSON.stringify({ event: 'card.viewed', cardId: '123' });

    const signature = signPayload(secret, payload);

    // Verify independently
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    expect(signature).toBe(expected);
  });

  it('should produce different signatures for different secrets', () => {
    const payload = JSON.stringify({ event: 'card.viewed' });
    const sig1 = signPayload('secret-a', payload);
    const sig2 = signPayload('secret-b', payload);
    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different payloads', () => {
    const secret = 'same-secret';
    const sig1 = signPayload(secret, '{"a":1}');
    const sig2 = signPayload(secret, '{"a":2}');
    expect(sig1).not.toBe(sig2);
  });
});

describe('deliverWebhook — retry logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should mark delivery as success on 2xx response', async () => {
    // We test attemptDelivery indirectly via the dispatch utility
    // by importing and testing signPayload + attemptDelivery separately
    const { attemptDelivery } = await import('../utils/webhookDispatch.js');

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await attemptDelivery(
      'https://example.com/webhook',
      '{"event":"test"}',
      'abc123',
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);

    vi.unstubAllGlobals();
  });

  it('should return failure on non-2xx response', async () => {
    const { attemptDelivery } = await import('../utils/webhookDispatch.js');

    const mockFetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await attemptDelivery(
      'https://example.com/webhook',
      '{"event":"test"}',
      'abc123',
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);

    vi.unstubAllGlobals();
  });

  it('should return failure on network error / timeout', async () => {
    const { attemptDelivery } = await import('../utils/webhookDispatch.js');

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await attemptDelivery(
      'https://example.com/webhook',
      '{"event":"test"}',
      'abc123',
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBeNull();

    vi.unstubAllGlobals();
  });
});
