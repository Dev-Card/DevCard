import { getErrorMessage } from '../utils/error.util.js'

import type { FastifyInstance } from 'fastify'

const PROFILE_CACHE_TTL = 300
const CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=60'

// ── Cache shape ────────────────────────────────────────────────────────────────
// The cache stores ONLY viewer-independent data.  The `followed` field is
// intentionally absent from cached links — it is computed fresh for every
// request after the cache is read.  `_userId` is stored internally so that
// background view-tracking can fire on cache-HIT requests without an extra
// DB round-trip.

type CachedLink = {
  id: string
  platform: string
  username: string
  url: string
  displayOrder: number
}

type CachedProfileEntry = {
  _userId: string
  username: string
  displayName: string
  bio: string | null
  pronouns: string | null
  role: string | null
  company: string | null
  avatarUrl: string | null
  accentColor: string
  links: CachedLink[]
}

// ── Helper: viewer-specific follow state ──────────────────────────────────────
// Queries which of the given links have been followed by `viewerId`.
// Returns an empty array for anonymous requests (viewerId === null) and when
// the profile has no links so the DB round-trip can be skipped entirely.

async function getFollowedLinkIds(
  app: FastifyInstance,
  links: CachedLink[],
  viewerId: string,
): Promise<string[]> {
  if (links.length === 0) { return [] }

  const successfulFollows = await app.prisma.followLog.findMany({
    where: {
      followerId: viewerId,
      status: 'success',
      OR: links.map((link) => ({
        platform: link.platform,
        targetUsername: link.username,
      })),
    },
    select: { platform: true, targetUsername: true },
  })

  return links
    .filter((link) =>
      successfulFollows.some(
        (f: any) =>
          f.platform === link.platform &&
          f.targetUsername.toLowerCase() === link.username.toLowerCase(),
      ),
    )
    .map((link) => link.id)
}

// ── Public: getPublicProfile ──────────────────────────────────────────────────
// Architecture:
//   1. Read shared profile data from Redis (or DB on cache miss).
//   2. Write shared-only data to Redis on cache miss.
//   3. Compute viewer-specific follow state AFTER reading from cache.
//   4. Merge follow state into the response before returning.
//
// This ensures the cached entry is identical regardless of which viewer
// triggered the cache population, and that every viewer always receives
// accurate follow status even when the cache is warm.

export async function getPublicProfile(
  app: FastifyInstance,
  username: string,
  viewerId: string | null,
  request: any,
) {
  const cacheKey = `profile:${username}`

  // ── Step 1: try cache ──────────────────────────────────────────────────────
  let cachedEntry: CachedProfileEntry | null = null

  if (app.redis) {
    try {
      const raw = await app.redis.get(cacheKey)
      if (raw) {
        cachedEntry = JSON.parse(raw) as CachedProfileEntry
      }
    } catch (err) {
      app.log.warn(`Redis cache read failed for ${cacheKey}: ${getErrorMessage(err)}`)
    }
  }

  // ── Cache HIT ──────────────────────────────────────────────────────────────
  if (cachedEntry !== null) {
    const { _userId, ...sharedData } = cachedEntry

    // Background view tracking — still fires on cache hit without a DB read.
    if (viewerId && viewerId !== _userId) {
      app.prisma.cardView
        .create({
          data: {
            ownerId: _userId,
            cardId: null,
            viewerId,
            viewerIp: request.ip ?? null,
            viewerAgent: request.headers['user-agent'] ?? null,
            source: (request.query as any)?.source ?? 'link',
          },
        })
        .catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`))
    }

    // Compute viewer-specific follow state against the cached link list.
    const followedLinkIds =
      viewerId ? await getFollowedLinkIds(app, sharedData.links, viewerId) : []

    const response = {
      ...sharedData,
      links: sharedData.links.map((link) => ({
        ...link,
        followed: followedLinkIds.includes(link.id),
      })),
    }

    return { cached: true, data: response, cacheKey }
  }

  // ── Cache MISS: fetch from DB ──────────────────────────────────────────────
  const user = await app.prisma.user.findUnique({
    where: { username },
    include: { platformLinks: { orderBy: { displayOrder: 'asc' } } },
  })
  if (!user) { return null }

  if (viewerId && viewerId !== user.id) {
    app.prisma.cardView
      .create({
        data: {
          ownerId: user.id,
          cardId: null,
          viewerId,
          viewerIp: request.ip ?? null,
          viewerAgent: request.headers['user-agent'] ?? null,
          source: (request.query as any)?.source ?? 'link',
        },
      })
      .catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`))
  }

  // Build viewer-independent link list — NO `followed` field.
  const sharedLinks: CachedLink[] = user.platformLinks.map((link: any) => ({
    id: link.id,
    platform: link.platform,
    username: link.username,
    url: link.url,
    displayOrder: link.displayOrder,
  }))

  // ── Step 2: populate cache with shared-only data ───────────────────────────
  if (app.redis) {
    const entry: CachedProfileEntry = {
      _userId: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      pronouns: user.pronouns,
      role: user.role,
      company: user.company,
      avatarUrl: user.avatarUrl,
      accentColor: user.accentColor,
      links: sharedLinks,
    }
    app.redis
      .set(cacheKey, JSON.stringify(entry), 'EX', PROFILE_CACHE_TTL)
      .catch((err: unknown) =>
        app.log.warn(`Redis cache write failed for ${cacheKey}: ${getErrorMessage(err)}`),
      )
  }

  // ── Step 3: compute viewer-specific follow state ───────────────────────────
  const followedLinkIds =
    viewerId ? await getFollowedLinkIds(app, sharedLinks, viewerId) : []

  const response = {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    pronouns: user.pronouns,
    role: user.role,
    company: user.company,
    avatarUrl: user.avatarUrl,
    accentColor: user.accentColor,
    links: sharedLinks.map((link) => ({
      ...link,
      followed: followedLinkIds.includes(link.id),
    })),
  }

  return { cached: false, data: response, cacheKey }
}

export async function getCardById(app: FastifyInstance, cardId: string) {
  const card = await app.prisma.card.findUnique({
    where: { id: cardId },
    include: {
      user: true,
      cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } },
    },
  })
  return card
}

export async function getUserCard(
  app: FastifyInstance,
  username: string,
  cardId: string,
  viewerId: string | null,
  request: any,
) {
  const user = await app.prisma.user.findUnique({ where: { username } })
  if (!user) { return { notFound: true } }
  const card = await app.prisma.card.findFirst({
    where: { id: cardId, userId: user.id },
    include: {
      cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } },
    },
  })
  if (!card) { return { notFound: true } }

  if (viewerId && viewerId !== user.id) {
    app.prisma.cardView
      .create({
        data: {
          ownerId: user.id,
          cardId: card.id,
          viewerId,
          viewerIp: request.ip ?? null,
          viewerAgent: request.headers['user-agent'] ?? null,
          source: (request.query as any)?.source ?? 'qr',
        },
      })
      .catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`))
  }

  const response = {
    title: card.title,
    owner: {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      pronouns: user.pronouns,
      role: user.role,
      company: user.company,
      avatarUrl: user.avatarUrl,
      accentColor: user.accentColor,
    },
    links: card.cardLinks.map((cl: any) => ({
      id: cl.platformLink.id,
      platform: cl.platformLink.platform,
      username: cl.platformLink.username,
      url: cl.platformLink.url,
      displayOrder: cl.displayOrder,
    })),
  }
  return { notFound: false, data: response }
}

export { CACHE_CONTROL_HEADER }
