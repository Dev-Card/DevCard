import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { profileRoutes } from '../routes/profiles.js';

import type { PrismaClient } from '@prisma/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-order-test';
const USERNAME = 'orderuser';

const baseLink = (id: string, displayOrder: number): Record<string, unknown> => ({
  id,
  userId: USER_ID,
  platform: 'github',
  username: `gh-${id}`,
  url: `https://github.com/gh-${id}`,
  displayOrder,
  createdAt: new Date(),
});

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRedis = { get: vi.fn(), set: vi.fn(), del: vi.fn() };

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  platformLink: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma);
  app.decorate('redis', mockRedis as any);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: USER_ID };
  });
  app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.ready();
  return app;
}

// ── Shared reset ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  (mockPrisma.user.findUnique as any).mockResolvedValue({ username: USERNAME });
  (mockPrisma.platformLink.aggregate as any).mockResolvedValue({ _max: { displayOrder: -1 } });
  (mockPrisma.platformLink.create as any).mockImplementation(({ data }: any) =>
    Promise.resolve(baseLink('link-new', data.displayOrder)),
  );
  (mockPrisma.platformLink.findFirst as any).mockResolvedValue(baseLink('link-1', 0));
  (mockPrisma.platformLink.update as any).mockResolvedValue(baseLink('link-1', 0));
  (mockPrisma.platformLink.delete as any).mockResolvedValue({});
  (mockPrisma.platformLink.updateMany as any).mockResolvedValue({ count: 1 });
  (mockPrisma.$transaction as any).mockImplementation(async (opsOrFn: any) => {
    if (typeof opsOrFn === 'function') {
      return opsOrFn(mockPrisma);
    }
    return Promise.all(opsOrFn);
  });

  mockRedis.del.mockResolvedValue(1);
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Normal create assigns next display order
// ─────────────────────────────────────────────────────────────────────────────

describe('createPlatformLink — display order assignment', () => {
  it('assigns displayOrder 0 when user has no links', async () => {
    (mockPrisma.platformLink.aggregate as any).mockResolvedValue({ _max: { displayOrder: null } });
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'user1' },
    });

    expect(res.statusCode).toBe(201);
    const createCall = (mockPrisma.platformLink.create as any).mock.calls[0][0];
    expect(createCall.data.displayOrder).toBe(0);
  });

  it('assigns max+1 when existing links are present', async () => {
    (mockPrisma.platformLink.aggregate as any).mockResolvedValue({ _max: { displayOrder: 3 } });
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'twitter', username: 'user2' },
    });

    expect(res.statusCode).toBe(201);
    const createCall = (mockPrisma.platformLink.create as any).mock.calls[0][0];
    expect(createCall.data.displayOrder).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Retry on P2002 (unique constraint conflict)
// ─────────────────────────────────────────────────────────────────────────────

describe('createPlatformLink — retry on P2002', () => {
  it('retries once after a P2002 conflict and succeeds on next attempt', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed on (user_id, display_order)'), {
      code: 'P2002',
    });

    // First create call: conflict; second: success
    (mockPrisma.platformLink.create as any)
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce(baseLink('link-retry', 1));

    // Second aggregate call returns updated max
    (mockPrisma.platformLink.aggregate as any)
      .mockResolvedValueOnce({ _max: { displayOrder: 0 } })
      .mockResolvedValueOnce({ _max: { displayOrder: 0 } });

    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'race-user' },
    });

    expect(res.statusCode).toBe(201);
    expect((mockPrisma.platformLink.create as any).mock.calls).toHaveLength(2);
  });

  it('retries up to 5 times then propagates the error', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed on (user_id, display_order)'), {
      code: 'P2002',
    });
    (mockPrisma.platformLink.create as any).mockRejectedValue(p2002);
    (mockPrisma.platformLink.aggregate as any).mockResolvedValue({ _max: { displayOrder: 0 } });

    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'always-conflict' },
    });

    expect(res.statusCode).toBe(500);
    expect((mockPrisma.platformLink.create as any).mock.calls).toHaveLength(5);
  });

  it('does not retry on non-P2002 errors', async () => {
    (mockPrisma.platformLink.create as any).mockRejectedValue(new Error('Connection refused'));

    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'db-down' },
    });

    expect(res.statusCode).toBe(500);
    expect((mockPrisma.platformLink.create as any).mock.calls).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Simulated concurrent creates
// ─────────────────────────────────────────────────────────────────────────────

describe('createPlatformLink — concurrent request simulation', () => {
  it('two simultaneous creates both succeed via retry when first conflicts', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed on (user_id, display_order)'), {
      code: 'P2002',
    });

    let createCallCount = 0;
    (mockPrisma.platformLink.aggregate as any).mockImplementation(() => {
      // Both reads see max=2 before either inserts
      return Promise.resolve({ _max: { displayOrder: 2 } });
    });
    (mockPrisma.platformLink.create as any).mockImplementation(({ data }: any) => {
      createCallCount++;
      // Simulate: first two calls (both at order=3) conflict; retries succeed
      if (createCallCount <= 2) {
        return Promise.reject(p2002);
      }
      return Promise.resolve(baseLink(`link-${createCallCount}`, data.displayOrder));
    });

    const app = await buildApp();

    const [res1, res2] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/profiles/me/links', payload: { platform: 'github', username: 'u1' } }),
      app.inject({ method: 'POST', url: '/api/profiles/me/links', payload: { platform: 'twitter', username: 'u2' } }),
    ]);

    expect(res1.statusCode).toBe(201);
    expect(res2.statusCode).toBe(201);
  });

  it('five parallel creates all resolve without error when retries succeed', async () => {
    const p2002 = Object.assign(new Error('Unique constraint failed on (user_id, display_order)'), {
      code: 'P2002',
    });

    // Alternate: first call of each group conflicts once, retry succeeds
    let callCount = 0;
    (mockPrisma.platformLink.create as any).mockImplementation(({ data }: any) => {
      callCount++;
      if (callCount % 2 === 1) {
        return Promise.reject(p2002);
      }
      return Promise.resolve(baseLink(`link-${callCount}`, data.displayOrder));
    });

    const app = await buildApp();

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/profiles/me/links',
          payload: { platform: 'github', username: `user-${i}` },
        }),
      ),
    );

    for (const res of results) {
      expect(res.statusCode).toBe(201);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Reorder — two-phase transaction
// ─────────────────────────────────────────────────────────────────────────────

describe('reorderLinks — two-phase transaction', () => {
  it('calls $transaction with a callback (interactive form)', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/reorder',
      payload: {
        links: [
          { id: '11111111-1111-1111-1111-111111111111', displayOrder: 0 },
          { id: '22222222-2222-2222-2222-222222222222', displayOrder: 1 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const txArg = (mockPrisma.$transaction as any).mock.calls[0][0];
    expect(typeof txArg).toBe('function');
  });

  it('issues updateMany for temp positions then final positions (two phases)', async () => {
    const updateManyCalls: number[] = [];
    (mockPrisma.platformLink.updateMany as any).mockImplementation(({ data }: any) => {
      updateManyCalls.push(data.displayOrder);
      return Promise.resolve({ count: 1 });
    });

    const app = await buildApp();

    await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/reorder',
      payload: {
        links: [
          { id: '11111111-1111-1111-1111-111111111111', displayOrder: 0 },
          { id: '22222222-2222-2222-2222-222222222222', displayOrder: 1 },
        ],
      },
    });

    // 4 updateMany calls total: 2 for temp (1_000_000+), 2 for final
    expect(updateManyCalls).toHaveLength(4);
    expect(updateManyCalls[0]).toBe(1_000_000);
    expect(updateManyCalls[1]).toBe(1_000_001);
    expect(updateManyCalls[2]).toBe(0);
    expect(updateManyCalls[3]).toBe(1);
  });

  it('reorder preserves correct final displayOrder values', async () => {
    const finalOrders: number[] = [];
    let callCount = 0;
    (mockPrisma.platformLink.updateMany as any).mockImplementation(({ data }: any) => {
      callCount++;
      // Second half of calls are the final-phase updates
      if (callCount > 2) {
        finalOrders.push(data.displayOrder);
      }
      return Promise.resolve({ count: 1 });
    });

    const app = await buildApp();

    await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/reorder',
      payload: {
        links: [
          { id: '11111111-1111-1111-1111-111111111111', displayOrder: 1 },
          { id: '22222222-2222-2222-2222-222222222222', displayOrder: 0 },
        ],
      },
    });

    expect(finalOrders).toEqual([1, 0]);
  });

  it('does not delete cache when transaction fails', async () => {
    (mockPrisma.$transaction as any).mockRejectedValue(new Error('Transaction aborted'));

    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/reorder',
      payload: { links: [{ id: '11111111-1111-1111-1111-111111111111', displayOrder: 0 }] },
    });

    expect(res.statusCode).toBe(500);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ordering integrity — sequential assignment
// ─────────────────────────────────────────────────────────────────────────────

describe('ordering integrity', () => {
  it('sequential creates produce strictly increasing displayOrder values', async () => {
    let currentMax = -1;
    (mockPrisma.platformLink.aggregate as any).mockImplementation(() =>
      Promise.resolve({ _max: { displayOrder: currentMax } }),
    );
    (mockPrisma.platformLink.create as any).mockImplementation(({ data }: any) => {
      currentMax = data.displayOrder;
      return Promise.resolve(baseLink(`link-${currentMax}`, currentMax));
    });

    const app = await buildApp();
    const orders: number[] = [];

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/profiles/me/links',
        payload: { platform: 'github', username: `user-${i}` },
      });
      expect(res.statusCode).toBe(201);
      orders.push(res.json().displayOrder);
    }

    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });

  it('delete then create assigns a new sequential displayOrder', async () => {
    (mockPrisma.platformLink.aggregate as any).mockResolvedValue({ _max: { displayOrder: 1 } });
    (mockPrisma.platformLink.create as any).mockResolvedValue(baseLink('link-new', 2));

    const app = await buildApp();

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/me/links/link-1',
    });
    expect(deleteRes.statusCode).toBe(204);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'twitter', username: 'userAfter' },
    });
    expect(createRes.statusCode).toBe(201);

    const createCall = (mockPrisma.platformLink.create as any).mock.calls[0][0];
    expect(createCall.data.displayOrder).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Regression — existing CRUD behavior preserved
// ─────────────────────────────────────────────────────────────────────────────

describe('regression — existing behavior preserved', () => {
  it('POST /links returns 201 with created link', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'regr-user' },
    });

    expect(res.statusCode).toBe(201);
  });

  it('PUT /links/:id returns 200 with updated link', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/link-1',
      payload: { platform: 'github', username: 'updated-handle' },
    });

    expect(res.statusCode).toBe(200);
  });

  it('PUT /links/:id returns 404 when link not found', async () => {
    (mockPrisma.platformLink.findFirst as any).mockResolvedValue(null);
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/nonexistent',
      payload: { platform: 'github', username: 'handle' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('DELETE /links/:id returns 204', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/me/links/link-1',
    });

    expect(res.statusCode).toBe(204);
  });

  it('DELETE /links/:id returns 404 when link not found', async () => {
    (mockPrisma.platformLink.findFirst as any).mockResolvedValue(null);
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/me/links/nonexistent',
    });

    expect(res.statusCode).toBe(404);
  });

  it('PUT /links/reorder returns 200 with message', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/reorder',
      payload: {
        links: [{ id: '11111111-1111-1111-1111-111111111111', displayOrder: 0 }],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe('Links reordered');
  });
});
