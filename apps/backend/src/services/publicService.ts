import { getErrorMessage } from '../utils/error.util.js'
import { dispatchWebhook } from '../utils/webhookDispatch.js'

import type { FastifyInstance } from 'fastify'

const PROFILE_CACHE_TTL = 300

export async function getPublicProfile(
  app: FastifyInstance,
  username: string,
  viewerId: string | null,
  request: any,
  authenticatedUserId: string | null = null,
): Promise<{ cached: boolean; data: object; cacheKey: string } | null> {
  const cacheKey = `profile:${username}`

  if (app.redis) {
    try {
      const cached = await app.redis.get(cacheKey)
      if (cached) {
        const { _userId, ...profileData } = JSON.parse(cached)
        // Only record a view if the viewer is not the owner
        const isSelfView = authenticatedUserId !== null && authenticatedUserId === _userId
        if (viewerId && !isSelfView) {
          app.prisma.cardView.create({ data: { ownerId: _userId, cardId: null, viewerId, viewerIp: request.ip || null, viewerAgent: request.headers['user-agent'] || null, source: request.query?.source || 'link' } }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`))
          dispatchWebhook(app.prisma as any, _userId, 'card.viewed', { event: 'card.viewed', cardId: null, viewerId, source: request.query?.source || 'link', timestamp: new Date().toISOString() }).catch((err: unknown) => app.log.error(`Webhook dispatch failed: ${getErrorMessage(err)}`))
        }
        return { cached: true, data: profileData, cacheKey }
      }
    } catch (err) {
      app.log.warn(`Redis cache read failed for ${cacheKey}: ${getErrorMessage(err)}`)
    }
  }

  const user = await app.prisma.user.findUnique({ where: { username }, include: { platformLinks: { orderBy: { displayOrder: 'asc' } } } })
  if (!user) { return null }

  // Block self-views: don't record a cardView if the authenticated user is the owner
  const isSelfView = authenticatedUserId !== null && authenticatedUserId === user.id
  if (viewerId && !isSelfView) {
    app.prisma.cardView.create({ data: { ownerId: user.id, cardId: null, viewerId, viewerIp: request.ip || null, viewerAgent: request.headers['user-agent'] || null, source: request.query?.source || 'link' } }).catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`))
    dispatchWebhook(app.prisma as any, user.id, 'card.viewed', { event: 'card.viewed', cardId: null, viewerId, source: request.query?.source || 'link', timestamp: new Date().toISOString() }).catch((error: unknown) => app.log.error(`Webhook dispatch failed: ${getErrorMessage(error)}`))
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

export async function getCardById(app: FastifyInstance, cardId: string): Promise<any> {
  const card = await app.prisma.card.findUnique({ where: { id: cardId }, include: { user: true, cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } } })
  return card
}

export async function getUserCard(
  app: FastifyInstance,
  username: string,
  cardId: string,
  viewerId: string | null,
  request: any,
  authenticatedUserId: string | null = null,
): Promise<{ notFound: boolean; data?: object }> {
  const user = await app.prisma.user.findUnique({ where: { username } })
  if (!user) { return { notFound: true } }
  const card = await app.prisma.card.findFirst({ where: { id: cardId, userId: user.id }, include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } } })
  if (!card) { return { notFound: true } }

  // Block self-views: don't record a cardView if the authenticated user is the owner
  const isSelfView = authenticatedUserId !== null && authenticatedUserId === user.id
  if (viewerId && !isSelfView) {
    app.prisma.cardView.create({ data: { ownerId: user.id, cardId: card.id, viewerId, viewerIp: request.ip || null, viewerAgent: request.headers['user-agent'] || null, source: request.query?.source || 'qr' } }).catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`))
    dispatchWebhook(app.prisma as any, user.id, 'card.viewed', { event: 'card.viewed', cardId: card.id, viewerId, source: request.query?.source || 'qr', timestamp: new Date().toISOString() }).catch((error: unknown) => app.log.error(`Webhook dispatch failed: ${getErrorMessage(error)}`))
  }

  const response = { title: card.title, owner: { username: user.username, displayName: user.displayName, bio: user.bio, pronouns: user.pronouns, role: user.role, company: user.company, avatarUrl: user.avatarUrl, accentColor: user.accentColor }, links: card.cardLinks.map((cl: any) => ({ id: cl.platformLink.id, platform: cl.platformLink.platform, username: cl.platformLink.username, url: cl.platformLink.url, displayOrder: cl.displayOrder })) }
  return { notFound: false, data: response }
}