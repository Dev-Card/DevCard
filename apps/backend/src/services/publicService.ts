import type { FastifyInstance } from 'fastify'
import { getErrorMessage } from '../utils/error.util.js'

const PROFILE_CACHE_TTL = 300
const CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=60'

export async function getPublicProfile(app: FastifyInstance, username: string, viewerId: string | null, request: any) {
  const cacheKey = `profile:${username}`

  if (app.redis) {
    try {
      const cached = await app.redis.get(cacheKey)
      if (cached) {
        const { _userId, ...profileData } = JSON.parse(cached)
        if (viewerId && viewerId !== _userId) {
          app.prisma.cardView.create({ data: { ownerId: _userId, cardId: null, viewerId, viewerIp: request.ip || null, viewerAgent: request.headers['user-agent'] || null, source: request.query?.source || 'link' } }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`))
        }
        return { cached: true, data: profileData, cacheKey }
      }
    } catch (err) {
      app.log.warn(`Redis cache read failed for ${cacheKey}: ${getErrorMessage(err)}`)
    }
  }

  const user = await app.prisma.user.findUnique({ where: { username }, include: { platformLinks: { orderBy: { displayOrder: 'asc' } } } })
  if (!user) return null

  if (viewerId && viewerId !== user.id) {
    app.prisma.cardView.create({ data: { ownerId: user.id, cardId: null, viewerId, viewerIp: request.ip || null, viewerAgent: request.headers['user-agent'] || null, source: request.query?.source || 'link' } }).catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`))
  }

  let followedLinkIds: string[] = []
  if (viewerId && user.platformLinks.length > 0) {
    const successfulFollows = await app.prisma.followLog.findMany({ where: { followerId: viewerId, status: 'success', OR: user.platformLinks.map((link: any) => ({ platform: link.platform, targetUsername: link.username })) }, select: { platform: true, targetUsername: true } })
    followedLinkIds = user.platformLinks.filter((link: any) => successfulFollows.some((f: any) => f.platform === link.platform && f.targetUsername.toLowerCase() === link.username.toLowerCase())).map((l: any) => l.id)
  }

  const baseLinks = user.platformLinks.map((link: any) => ({ id: link.id, platform: link.platform, username: link.username, url: link.url, displayOrder: link.displayOrder, followed: false }))

  if (app.redis) {
    const entry = { _userId: user.id, username: user.username, displayName: user.displayName, bio: user.bio, pronouns: user.pronouns, role: user.role, company: user.company, avatarUrl: user.avatarUrl, accentColor: user.accentColor, links: baseLinks }
    app.redis.set(cacheKey, JSON.stringify(entry), 'EX', PROFILE_CACHE_TTL).catch((err: unknown) => app.log.warn(`Redis cache write failed for ${cacheKey}: ${getErrorMessage(err)}`))
  }

  const response = { username: user.username, displayName: user.displayName, bio: user.bio, pronouns: user.pronouns, role: user.role, company: user.company, avatarUrl: user.avatarUrl, accentColor: user.accentColor, links: baseLinks.map((link) => ({ ...link, followed: followedLinkIds.includes(link.id) })) }

  return { cached: false, data: response, cacheKey }
}

export async function getCardById(app: FastifyInstance, cardId: string) {
  const card = await app.prisma.card.findUnique({ where: { id: cardId }, include: { user: true, cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } } })
  return card
}

export async function getUserCard(app: FastifyInstance, username: string, cardId: string, viewerId: string | null, request: any) {
  const user = await app.prisma.user.findUnique({ where: { username } })
  if (!user) return { notFound: true }
  const card = await app.prisma.card.findFirst({ where: { id: cardId, userId: user.id }, include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } } })
  if (!card) return { notFound: true }

  if (viewerId && viewerId !== user.id) {
    app.prisma.cardView.create({ data: { ownerId: user.id, cardId: card.id, viewerId, viewerIp: request.ip || null, viewerAgent: request.headers['user-agent'] || null, source: request.query?.source || 'qr' } }).catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`))
  }

  const response = { title: card.title, owner: { username: user.username, displayName: user.displayName, bio: user.bio, pronouns: user.pronouns, role: user.role, company: user.company, avatarUrl: user.avatarUrl, accentColor: user.accentColor }, links: card.cardLinks.map((cl: any) => ({ id: cl.platformLink.id, platform: cl.platformLink.platform, username: cl.platformLink.username, url: cl.platformLink.url, displayOrder: cl.displayOrder })) }
  return { notFound: false, data: response }
}
