/**
 * public-profile-cache.test.ts
 *
 * Verifies that the public profile caching layer correctly separates shared
 * profile data (safe to cache) from viewer-specific follow state (computed
 * per-request).  The core invariant:
 *
 *   cache entry = shared data only, never contains `followed` state
 *   response    = shared data + viewer-specific `followed` merged in at read time
 *
 * Test categories:
 *   - Cache population (MISS → DB → Redis write)
 *   - Cache hit behaviour (HIT → Redis read → follow state computed fresh)
 *   - Viewer isolation (Viewer A ≠ Viewer B)
 *   - Anonymous requests (viewerId = null)
 *   - Cache integrity (stored bytes never contain viewer data)
 *   - Follow state correctness after cache warm-up
 *   - Regression: existing profile/cache/follow paths still work
 */

import jwt from '@fastify/jwt'
import Fastify from 'fastify'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { publicRoutes } from '../routes/public.js'

import type { PrismaClient } from '@prisma/client'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VIEWER_A = 'viewer-aaa'
const VIEWER_B = 'viewer-bbb'
const PROFILE_OWNER = 'owner-111'

const LINK_GITHUB = {
  id: 'link-gh',
  platform: 'github',
  username: 'octocat',
  url: 'https://github.com/octocat',
  displayOrder: 0,
}

const LINK_TWITTER = {
  id: 'link-tw',
  platform: 'twitter',
  username: 'octocat',
  url: 'https://twitter.com/octocat',
  displayOrder: 1,
}

const mockUser = {
  id: PROFILE_OWNER,
  username: 'octocat',
  displayName: 'The Octocat',
  bio: 'GitHub mascot',
  pronouns: null,
  role: 'Mascot',
  company: 'GitHub',
  avatarUrl: 'https://github.com/images/mona-loading-default.gif',
  accentColor: '#24292e',
  platformLinks: [LINK_GITHUB, LINK_TWITTER],
}

const mockUserNoLinks = { ...mockUser, platformLinks: [] }

// Shared profile data as it should appear in the Redis cache.
// Note: links have NO `followed` field.
const expectedCacheEntry = {
  _userId: PROFILE_OWNER,
  username: 'octocat',
  displayName: 'The Octocat',
  bio: 'GitHub mascot',
  pronouns: null,
  role: 'Mascot',
  company: 'GitHub',
  avatarUrl: 'https://github.com/images/mona-loading-default.gif',
  accentColor: '#24292e',
  links: [
    { id: 'link-gh', platform: 'github', username: 'octocat', url: 'https://github.com/octocat', displayOrder: 0 },
    { id: 'link-tw', platform: 'twitter', username: 'octocat', url: 'https://twitter.com/octocat', displayOrder: 1 },
  ],
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: { findUnique: vi.fn() },
  platformLink: {} as any,
  cardView: { create: vi.fn().mockReturnValue({ catch: vi.fn() }) },
  followLog: { findMany: vi.fn().mockResolvedValue([]) },
  card: {} as any,
}

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
}

async function buildApp() {
  const app = Fastify()
  await app.register(jwt, { secret: 'test-secret-unit' })
  app.decorate('prisma', mockPrisma as unknown as PrismaClient)
  app.decorate('redis', mockRedis as any)
  app.register(publicRoutes, { prefix: '/api/public' })
  await app.ready()
  return app
}

// Helper: sign a JWT for a given userId so inject() can carry auth headers
function makeAuthHeader(app: Awaited<ReturnType<typeof buildApp>>, userId: string) {
  const token = app.jwt.sign({ id: userId })
  return { authorization: `Bearer ${token}` }
}

// Helper: encode a warm-cache entry as a JSON string the way Redis stores it
function warmCache(entry: object) {
  mockRedis.get.mockResolvedValue(JSON.stringify(entry))
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cache population — MISS path writes shared-only data
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache population (MISS → DB → Redis write)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.followLog.findMany.mockResolvedValue([])
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('writes the profile to Redis on cache MISS', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(mockRedis.set).toHaveBeenCalledWith('profile:octocat', expect.any(String), 'EX', 300)
  })

  it('cache entry contains no `followed` field on any link', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })

    const [, rawJson] = mockRedis.set.mock.calls[0]
    const stored = JSON.parse(rawJson)
    for (const link of stored.links) {
      expect(link).not.toHaveProperty('followed')
    }
  })

  it('cache entry contains viewer-independent link shape', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()

    // Even when a viewer who follows github is logged in, the cache must not
    // contain their follow state.
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const headers = makeAuthHeader(app, VIEWER_A)
    await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const [, rawJson] = mockRedis.set.mock.calls[0]
    const stored = JSON.parse(rawJson)
    for (const link of stored.links) {
      expect(link).not.toHaveProperty('followed')
    }
  })

  it('returns X-Cache: MISS on first request', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.headers['x-cache']).toBe('MISS')
  })

  it('queries DB on cache MISS', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(mockPrisma.user.findUnique).toHaveBeenCalledOnce()
  })

  it('stores _userId in cache for view-tracking but never exposes it in HTTP response', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })

    // _userId must be in cache
    const [, rawJson] = mockRedis.set.mock.calls[0]
    const stored = JSON.parse(rawJson)
    expect(stored._userId).toBe(PROFILE_OWNER)

    // _userId must NOT appear in the HTTP response
    expect(res.json()).not.toHaveProperty('_userId')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cache hit behaviour — HIT path computes follow state fresh
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache hit behaviour (HIT → Redis read → follow state computed fresh)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('returns X-Cache: HIT when the cache is warm', async () => {
    warmCache(expectedCacheEntry)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.headers['x-cache']).toBe('HIT')
  })

  it('does not query the DB on cache HIT', async () => {
    warmCache(expectedCacheEntry)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('queries followLog for authenticated viewer even on cache HIT', async () => {
    warmCache(expectedCacheEntry)
    mockPrisma.followLog.findMany.mockResolvedValue([])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    await app.inject({ method: 'GET', url: '/api/public/octocat', headers })
    expect(mockPrisma.followLog.findMany).toHaveBeenCalledOnce()
  })

  it('does not query followLog for anonymous request on cache HIT', async () => {
    warmCache(expectedCacheEntry)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(mockPrisma.followLog.findMany).not.toHaveBeenCalled()
  })

  it('_userId is stripped from cache HIT HTTP response', async () => {
    warmCache(expectedCacheEntry)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.json()).not.toHaveProperty('_userId')
  })

  it('profile fields from cache are returned correctly on HIT', async () => {
    warmCache(expectedCacheEntry)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    const body = res.json()
    expect(body.username).toBe('octocat')
    expect(body.displayName).toBe('The Octocat')
    expect(body.accentColor).toBe('#24292e')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Viewer isolation — same cache, different follow state per viewer
// ─────────────────────────────────────────────────────────────────────────────

describe('Viewer isolation — same cached profile, viewer-specific follow state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('Viewer A (follows github) sees followed=true for github link', async () => {
    warmCache(expectedCacheEntry)
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    const githubLink = links.find((l) => l.id === 'link-gh')
    const twitterLink = links.find((l) => l.id === 'link-tw')
    expect(githubLink?.followed).toBe(true)
    expect(twitterLink?.followed).toBe(false)
  })

  it('Viewer B (follows nothing) sees followed=false for all links', async () => {
    warmCache(expectedCacheEntry)
    mockPrisma.followLog.findMany.mockResolvedValue([])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_B)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    expect(links.every((l) => l.followed === false)).toBe(true)
  })

  it('Viewer A and Viewer B receive different follow states from the same cached entry', async () => {
    // Both requests share the same warm cache entry (set once before both requests).
    warmCache(expectedCacheEntry)
    const app = await buildApp()

    // Viewer A follows github
    mockPrisma.followLog.findMany.mockResolvedValueOnce([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const resA = await app.inject({
      method: 'GET',
      url: '/api/public/octocat',
      headers: makeAuthHeader(app, VIEWER_A),
    })

    // Viewer B follows nothing
    mockPrisma.followLog.findMany.mockResolvedValueOnce([])
    const resB = await app.inject({
      method: 'GET',
      url: '/api/public/octocat',
      headers: makeAuthHeader(app, VIEWER_B),
    })

    // DB must not have been consulted for the profile on either request
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()

    const linksA = resA.json().links as Array<{ id: string; followed: boolean }>
    const linksB = resB.json().links as Array<{ id: string; followed: boolean }>

    const ghA = linksA.find((l) => l.id === 'link-gh')
    const ghB = linksB.find((l) => l.id === 'link-gh')

    expect(ghA?.followed).toBe(true)
    expect(ghB?.followed).toBe(false)
  })

  it('Viewer A following both links sees followed=true for both', async () => {
    warmCache(expectedCacheEntry)
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
      { platform: 'twitter', targetUsername: 'octocat' },
    ])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    expect(links.every((l) => l.followed === true)).toBe(true)
  })

  it('follow state is case-insensitive on targetUsername comparison', async () => {
    warmCache(expectedCacheEntry)
    // followLog stores the username with different casing
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'OCTOCAT' },
    ])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    const ghLink = links.find((l) => l.id === 'link-gh')
    expect(ghLink?.followed).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Anonymous requests
// ─────────────────────────────────────────────────────────────────────────────

describe('Anonymous requests (no authentication)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('anonymous request on cache MISS returns followed=false for all links', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })

    const links = res.json().links as Array<{ followed: boolean }>
    expect(links.every((l) => l.followed === false)).toBe(true)
  })

  it('anonymous request on cache HIT returns followed=false for all links', async () => {
    warmCache(expectedCacheEntry)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })

    const links = res.json().links as Array<{ followed: boolean }>
    expect(links.every((l) => l.followed === false)).toBe(true)
  })

  it('anonymous request does not call followLog', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(mockPrisma.followLog.findMany).not.toHaveBeenCalled()
  })

  it('anonymous request still populates cache', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(mockRedis.set).toHaveBeenCalledWith('profile:octocat', expect.any(String), 'EX', 300)
  })

  it('anonymous request on profile with no links returns empty links array', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue(mockUserNoLinks)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.json().links).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cache integrity — stored bytes never contain viewer data
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache integrity — stored bytes never contain viewer state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('cache entry is identical regardless of which viewer triggered population', async () => {
    // First request from Viewer A who follows github
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const appA = await buildApp()
    const headersA = makeAuthHeader(appA, VIEWER_A)
    await appA.inject({ method: 'GET', url: '/api/public/octocat', headers: headersA })
    const storedByA = mockRedis.set.mock.calls[0][1]

    vi.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })

    // Second request from Viewer B who follows nothing
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockPrisma.followLog.findMany.mockResolvedValue([])
    const appB = await buildApp()
    const headersB = makeAuthHeader(appB, VIEWER_B)
    await appB.inject({ method: 'GET', url: '/api/public/octocat', headers: headersB })
    const storedByB = mockRedis.set.mock.calls[0][1]

    // The raw JSON bytes written to Redis must be identical.
    expect(storedByA).toBe(storedByB)
  })

  it('cache entry populated by authenticated viewer has no `followed` field', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const [, rawJson] = mockRedis.set.mock.calls[0]
    const stored = JSON.parse(rawJson)
    for (const link of stored.links) {
      expect(link).not.toHaveProperty('followed')
    }
  })

  it('cache entry populated by anonymous request has no `followed` field', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })

    const [, rawJson] = mockRedis.set.mock.calls[0]
    const stored = JSON.parse(rawJson)
    for (const link of stored.links) {
      expect(link).not.toHaveProperty('followed')
    }
  })

  it('cache entry link shape contains only shared fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    await app.inject({ method: 'GET', url: '/api/public/octocat' })

    const [, rawJson] = mockRedis.set.mock.calls[0]
    const stored = JSON.parse(rawJson)
    const sharedKeys = new Set(['id', 'platform', 'username', 'url', 'displayOrder'])
    for (const link of stored.links) {
      const keys = new Set(Object.keys(link))
      for (const k of keys) {
        expect(sharedKeys.has(k)).toBe(true)
      }
    }
  })

  it('Viewer A follow state does not bleed into subsequent Viewer B response', async () => {
    // Step 1: Viewer A warms the cache (follows github)
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockPrisma.followLog.findMany.mockResolvedValueOnce([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const app = await buildApp()
    const headersA = makeAuthHeader(app, VIEWER_A)
    await app.inject({ method: 'GET', url: '/api/public/octocat', headers: headersA })

    // Step 2: Viewer B requests same profile — cache is now warm
    const storedJson = mockRedis.set.mock.calls[0][1]
    mockRedis.get.mockResolvedValue(storedJson)
    mockPrisma.followLog.findMany.mockResolvedValueOnce([]) // Viewer B follows nothing

    const headersB = makeAuthHeader(app, VIEWER_B)
    const resB = await app.inject({ method: 'GET', url: '/api/public/octocat', headers: headersB })

    const linksB = resB.json().links as Array<{ id: string; followed: boolean }>
    expect(linksB.every((l) => l.followed === false)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Follow state correctness after cache warm-up
// ─────────────────────────────────────────────────────────────────────────────

describe('Follow state correctness after cache warm-up', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('returns correct follow state for viewer who just followed while cache was warm', async () => {
    // Warm cache was populated while viewer had NOT yet followed
    warmCache(expectedCacheEntry)
    // Now viewer has followed github — followLog returns it
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
    ])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    const gh = links.find((l) => l.id === 'link-gh')
    expect(gh?.followed).toBe(true)
    // DB profile query was skipped (cache HIT)
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('returns correct follow state for viewer who just unfollowed while cache was warm', async () => {
    warmCache(expectedCacheEntry)
    // Viewer has unfollowed — followLog returns empty
    mockPrisma.followLog.findMany.mockResolvedValue([])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    expect(links.every((l) => l.followed === false)).toBe(true)
  })

  it('cache HIT with follows returns all followed links correctly', async () => {
    warmCache(expectedCacheEntry)
    mockPrisma.followLog.findMany.mockResolvedValue([
      { platform: 'github', targetUsername: 'octocat' },
      { platform: 'twitter', targetUsername: 'octocat' },
    ])
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat', headers })

    const links = res.json().links as Array<{ id: string; followed: boolean }>
    expect(links.find((l) => l.id === 'link-gh')?.followed).toBe(true)
    expect(links.find((l) => l.id === 'link-tw')?.followed).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Regression — existing profile / cache / follow behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('Regression — existing public profile behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    mockPrisma.followLog.findMany.mockResolvedValue([])
    mockPrisma.cardView.create.mockReturnValue({ catch: vi.fn() })
  })

  it('returns 404 for unknown user on cache MISS', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/nobody' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error).toBe('User not found')
  })

  it('returns 200 with correct profile shape on cache MISS', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.username).toBe('octocat')
    expect(body.displayName).toBe('The Octocat')
    expect(Array.isArray(body.links)).toBe(true)
    expect(body.links).toHaveLength(2)
  })

  it('does not set Cache-Control: private on public profile responses', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.headers['cache-control']).toContain('public')
  })

  it('falls through to DB when Redis.get throws', async () => {
    mockRedis.get.mockRejectedValue(new Error('Redis unavailable'))
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.statusCode).toBe(200)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledOnce()
  })

  it('profile with no links returns empty links array', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUserNoLinks)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(res.json().links).toEqual([])
  })

  it('profile with no links skips followLog query on cache MISS', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUserNoLinks)
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    await app.inject({ method: 'GET', url: '/api/public/octocat', headers })
    expect(mockPrisma.followLog.findMany).not.toHaveBeenCalled()
  })

  it('profile with no links skips followLog query on cache HIT', async () => {
    const emptyLinkEntry = { ...expectedCacheEntry, links: [] }
    warmCache(emptyLinkEntry)
    const app = await buildApp()
    const headers = makeAuthHeader(app, VIEWER_A)
    await app.inject({ method: 'GET', url: '/api/public/octocat', headers })
    expect(mockPrisma.followLog.findMany).not.toHaveBeenCalled()
  })

  it('X-Cache header is MISS on first request and HIT after cache is populated', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    const app = await buildApp()

    const firstRes = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(firstRes.headers['x-cache']).toBe('MISS')

    // Simulate cache now warm
    const stored = mockRedis.set.mock.calls[0][1]
    mockRedis.get.mockResolvedValue(stored)
    mockPrisma.followLog.findMany.mockResolvedValue([])

    const secondRes = await app.inject({ method: 'GET', url: '/api/public/octocat' })
    expect(secondRes.headers['x-cache']).toBe('HIT')
  })
})
