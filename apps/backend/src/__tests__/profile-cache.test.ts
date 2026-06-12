/**
 * profile-cache.test.ts
 *
 * Verifies that every platform link mutation correctly invalidates the public
 * profile Redis cache, and that the cache lifecycle (hit, miss, repopulation)
 * works as intended.
 */

import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { profileRoutes } from '../routes/profiles.js';
import { publicRoutes } from '../routes/public.js';

import type { PrismaClient } from '@prisma/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-cache-test';
const USERNAME = 'cacheuser';
const CACHE_KEY = `profile:${USERNAME}`;

const mockLink = {
  id: 'link-1',
  userId: USER_ID,
  platform: 'github',
  username: 'gh-handle',
  url: 'https://github.com/gh-handle',
  displayOrder: 0,
};

const cachedProfile = {
  _userId: USER_ID,
  username: USERNAME,
  displayName: 'Cache User',
  bio: null,
  pronouns: null,
  role: null,
  company: null,
  avatarUrl: null,
  accentColor: '#6366f1',
  links: [
    {
      id: mockLink.id,
      platform: mockLink.platform,
      username: mockLink.username,
      url: mockLink.url,
      displayOrder: 0,
      followed: false,
    },
  ],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

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
  cardView: {
    create: vi.fn().mockReturnValue({ catch: vi.fn() }),
  },
  followLog: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

// ── App builders ──────────────────────────────────────────────────────────────

async function buildProfileApp(withRedis = true) {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma);
  if (withRedis) {
    app.decorate('redis', mockRedis as any);
  }
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: USER_ID };
  });
  app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.ready();
  return app;
}

async function buildPublicApp(withRedis = true) {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma);
  if (withRedis) {
    app.decorate('redis', mockRedis as any);
  }
  // Soft auth: always throws (unauthenticated visitor)
  app.decorateRequest('jwtVerify', async function () {
    throw new Error('no token');
  });
  app.register(publicRoutes, { prefix: '/api/u' });
  await app.ready();
  return app;
}

// ── Shared reset ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path for cache invalidation helper: return the user's username
  (mockPrisma.user.findUnique as any).mockResolvedValue({ username: USERNAME });

  // Default platform link mocks
  (mockPrisma.platformLink.findFirst as any).mockResolvedValue(mockLink);
  (mockPrisma.platformLink.aggregate as any).mockResolvedValue({
    _max: { displayOrder: 0 },
  });
  (mockPrisma.platformLink.create as any).mockResolvedValue(mockLink);
  (mockPrisma.platformLink.update as any).mockResolvedValue(mockLink);
  (mockPrisma.platformLink.delete as any).mockResolvedValue({});
  (mockPrisma.platformLink.updateMany as any).mockResolvedValue({ count: 1 });
  (mockPrisma.$transaction as any).mockImplementation(async (opsOrFn: any) => {
    if (typeof opsOrFn === 'function') {
      return opsOrFn(mockPrisma);
    }
    return Promise.all(opsOrFn);
  });

  // Default Redis mocks
  mockRedis.del.mockResolvedValue(1);
  mockRedis.get.mockResolvedValue(null); // cache miss by default
  mockRedis.set.mockResolvedValue('OK');
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cached profile returns expected data
// ─────────────────────────────────────────────────────────────────────────────

describe('public profile — cache hit', () => {
  it('returns cached data without querying the DB', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedProfile));
    const app = await buildPublicApp();

    const res = await app.inject({ method: 'GET', url: `/api/u/${USERNAME}` });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.username).toBe(USERNAME);
    expect(body.displayName).toBe('Cache User');
    expect(body.links).toHaveLength(1);
    expect(body.links[0].platform).toBe('github');
    // DB must NOT have been queried
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: USERNAME } }),
    );
  });

  it('sets X-Cache: HIT header on a cache hit', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedProfile));
    const app = await buildPublicApp();

    const res = await app.inject({ method: 'GET', url: `/api/u/${USERNAME}` });

    expect(res.headers['x-cache']).toBe('HIT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cache miss — DB fetch and cache population
// ─────────────────────────────────────────────────────────────────────────────

describe('public profile — cache miss', () => {
  it('fetches from DB and populates the cache', async () => {
    mockRedis.get.mockResolvedValue(null); // cache miss
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      id: USER_ID,
      username: USERNAME,
      displayName: 'Cache User',
      bio: null,
      pronouns: null,
      role: null,
      company: null,
      avatarUrl: null,
      accentColor: '#6366f1',
      platformLinks: [],
    });

    const app = await buildPublicApp();
    const res = await app.inject({ method: 'GET', url: `/api/u/${USERNAME}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().username).toBe(USERNAME);
    // Cache should have been written
    expect(mockRedis.set).toHaveBeenCalledWith(
      CACHE_KEY,
      expect.any(String),
      'EX',
      300,
    );
  });

  it('sets X-Cache: MISS header on a cache miss', async () => {
    mockRedis.get.mockResolvedValue(null);
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      id: USER_ID,
      username: USERNAME,
      displayName: 'Cache User',
      bio: null,
      pronouns: null,
      role: null,
      company: null,
      avatarUrl: null,
      accentColor: '#6366f1',
      platformLinks: [],
    });

    const app = await buildPublicApp();
    const res = await app.inject({ method: 'GET', url: `/api/u/${USERNAME}` });

    expect(res.headers['x-cache']).toBe('MISS');
  });

  it('returns 404 and does not populate cache when user is not found', async () => {
    mockRedis.get.mockResolvedValue(null);
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);

    const app = await buildPublicApp();
    const res = await app.inject({ method: 'GET', url: '/api/u/nobody' });

    expect(res.statusCode).toBe(404);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Create link invalidates cache
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/profiles/me/links — cache invalidation', () => {
  it('deletes the profile cache key after a successful create', async () => {
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    expect(res.statusCode).toBe(201);
    expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEY);
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
  });

  it('does not delete the cache when the DB create fails', async () => {
    (mockPrisma.platformLink.create as any).mockRejectedValue(
      new Error('DB connection lost'),
    );
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    expect(res.statusCode).toBe(500);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('does not attempt cache invalidation when Redis is absent', async () => {
    const app = await buildProfileApp(false); // no redis

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    expect(res.statusCode).toBe(201);
    // mockRedis.del is never called because app.redis is undefined
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Update link invalidates cache
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/profiles/me/links/:id — cache invalidation', () => {
  it('deletes the profile cache key after a successful update', async () => {
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'PUT',
      url: `/api/profiles/me/links/${mockLink.id}`,
      payload: { platform: 'github', username: 'new-handle' },
    });

    expect(res.statusCode).toBe(200);
    expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEY);
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
  });

  it('does not delete the cache when the link does not exist', async () => {
    (mockPrisma.platformLink.findFirst as any).mockResolvedValue(null);
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/nonexistent',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    expect(res.statusCode).toBe(404);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('does not delete the cache when the DB update fails', async () => {
    (mockPrisma.platformLink.update as any).mockRejectedValue(
      new Error('DB write error'),
    );
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'PUT',
      url: `/api/profiles/me/links/${mockLink.id}`,
      payload: { platform: 'github', username: 'gh-handle' },
    });

    expect(res.statusCode).toBe(500);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Delete link invalidates cache
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/profiles/me/links/:id — cache invalidation', () => {
  it('deletes the profile cache key after a successful delete', async () => {
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/profiles/me/links/${mockLink.id}`,
    });

    expect(res.statusCode).toBe(204);
    expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEY);
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
  });

  it('does not delete the cache when the link does not exist', async () => {
    (mockPrisma.platformLink.findFirst as any).mockResolvedValue(null);
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/profiles/me/links/nonexistent',
    });

    expect(res.statusCode).toBe(404);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('does not delete the cache when the DB delete fails', async () => {
    (mockPrisma.platformLink.delete as any).mockRejectedValue(
      new Error('FK constraint'),
    );
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/profiles/me/links/${mockLink.id}`,
    });

    expect(res.statusCode).toBe(500);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Reorder links invalidates cache
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/profiles/me/links/reorder — cache invalidation', () => {
  it('deletes the profile cache key after a successful reorder', async () => {
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'PUT',
      url: '/api/profiles/me/links/reorder',
      payload: {
        links: [
          { id: '11111111-1111-1111-1111-111111111111', displayOrder: 1 },
          { id: '22222222-2222-2222-2222-222222222222', displayOrder: 0 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe('Links reordered');
    expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEY);
    expect(mockRedis.del).toHaveBeenCalledTimes(1);
  });

  it('does not delete the cache when the transaction fails', async () => {
    (mockPrisma.$transaction as any).mockRejectedValue(
      new Error('Transaction aborted'),
    );
    const app = await buildProfileApp();

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
// 7. Cache repopulates correctly after invalidation
// ─────────────────────────────────────────────────────────────────────────────

describe('cache repopulation after invalidation', () => {
  it('re-fetches from DB and repopulates cache on the next GET after a link mutation', async () => {
    // Simulate: cache starts cold after the invalidation del
    mockRedis.get.mockResolvedValue(null);
    (mockPrisma.user.findUnique as any)
      // For cache invalidation username lookup (called inside profileService)
      .mockResolvedValueOnce({ username: USERNAME })
      // For the subsequent GET /api/u/:username DB fetch
      .mockResolvedValueOnce({
        id: USER_ID,
        username: USERNAME,
        displayName: 'Cache User',
        bio: null,
        pronouns: null,
        role: null,
        company: null,
        avatarUrl: null,
        accentColor: '#6366f1',
        platformLinks: [mockLink],
      });

    const profileApp = await buildProfileApp();
    const publicApp = await buildPublicApp();

    // 1. Create a link (triggers del)
    const createRes = await profileApp.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });
    expect(createRes.statusCode).toBe(201);
    expect(mockRedis.del).toHaveBeenCalledWith(CACHE_KEY);

    // 2. Next GET should miss the cache and repopulate it
    const getRes = await publicApp.inject({
      method: 'GET',
      url: `/api/u/${USERNAME}`,
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().username).toBe(USERNAME);
    expect(mockRedis.set).toHaveBeenCalledWith(
      CACHE_KEY,
      expect.any(String),
      'EX',
      300,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Multiple consecutive mutations remain consistent
// ─────────────────────────────────────────────────────────────────────────────

describe('multiple consecutive mutations', () => {
  it('each mutation independently invalidates the cache', async () => {
    const app = await buildProfileApp();

    // Create
    await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    // Update
    await app.inject({
      method: 'PUT',
      url: `/api/profiles/me/links/${mockLink.id}`,
      payload: { platform: 'github', username: 'updated-handle' },
    });

    // Delete
    await app.inject({
      method: 'DELETE',
      url: `/api/profiles/me/links/${mockLink.id}`,
    });

    // Each mutation triggers exactly one del call
    expect(mockRedis.del).toHaveBeenCalledTimes(3);
    // All calls use the same cache key (same user)
    for (const call of mockRedis.del.mock.calls) {
      expect(call[0]).toBe(CACHE_KEY);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Cache key consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('cache key format', () => {
  it('invalidates using the same key format that publicService writes', async () => {
    // publicService writes  profile:<username>
    // profileService must delete profile:<username>
    const app = await buildProfileApp();

    await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    expect(mockRedis.del).toHaveBeenCalledWith(`profile:${USERNAME}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Redis errors during invalidation do not fail the mutation
// ─────────────────────────────────────────────────────────────────────────────

describe('Redis errors are non-fatal', () => {
  it('returns 201 even when redis.del rejects', async () => {
    mockRedis.del.mockRejectedValue(new Error('Redis connection lost'));
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/profiles/me/links',
      payload: { platform: 'github', username: 'gh-handle' },
    });

    // Mutation succeeded; cache failure is swallowed
    expect(res.statusCode).toBe(201);
  });

  it('returns 204 for delete even when redis.del rejects', async () => {
    mockRedis.del.mockRejectedValue(new Error('Redis connection lost'));
    const app = await buildProfileApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/profiles/me/links/${mockLink.id}`,
    });

    expect(res.statusCode).toBe(204);
  });
});
