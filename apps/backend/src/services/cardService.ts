import { CardVisibility, Prisma } from '@prisma/client'
import { generateUniqueSlug } from '../utils/slug.js'
import { generateQRBuffer } from '../utils/qr.js'

import type { FastifyInstance } from 'fastify'

type CardLinkWithPlatform = { platformLink: unknown }
type RawCard = {
  id: string
  userId: string
  title: string
  description: string | null
  slug: string
  visibility: CardVisibility
  qrEnabled: boolean
  viewCount: number
  isDefault: boolean
  cardLinks: CardLinkWithPlatform[]
}

export type CardResponse = {
  id: string
  userId: string
  title: string
  description: string | null
  slug: string
  visibility: CardVisibility
  qrEnabled: boolean
  viewCount: number
  isDefault: boolean
  links: unknown[]
}

export type CreateCardBody = {
  title: string
  linkIds: string[]
  description?: string
  visibility?: CardVisibility
}

export type UpdateCardBody = {
  title?: string
  linkIds?: string[]
  description?: string
  visibility?: CardVisibility
  qrEnabled?: boolean
}

function mapCard(card: RawCard): CardResponse {
  return {
    id: card.id,
    userId: card.userId,
    title: card.title,
    description: card.description,
    slug: card.slug,
    visibility: card.visibility,
    qrEnabled: card.qrEnabled,
    viewCount: card.viewCount,
    isDefault: card.isDefault,
    links: card.cardLinks.map(cl => cl.platformLink),
  }
}

export async function listCards(app: FastifyInstance, userId: string): Promise<CardResponse[]> {
  const cards = await app.prisma.card.findMany({
    where: { userId },
    take: 50,
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return cards.map(card => mapCard(card as RawCard))
}

export async function createCard(app: FastifyInstance, userId: string, body: CreateCardBody): Promise<CardResponse> {
  const ownedLinks = await app.prisma.platformLink.findMany({ where: { id: { in: body.linkIds }, userId }, select: { id: true } })
  if (ownedLinks.length !== body.linkIds.length) throw Object.assign(new Error('Link ownership mismatch'), { code: 'OWNERSHIP' })

  const slug = await generateUniqueSlug(body.title, async value => {
    const existing = await app.prisma.card.findUnique({ where: { slug: value }, select: { id: true } })
    return Boolean(existing)
  })

  const cardCount = await app.prisma.card.count({ where: { userId } })
  const card = await app.prisma.card.create({
    data: {
      userId,
      title: body.title,
      description: body.description,
      slug,
      visibility: body.visibility ?? CardVisibility.PUBLIC,
      isDefault: cardCount === 0,
      cardLinks: { create: body.linkIds.map((linkId, index) => ({ platformLinkId: linkId, displayOrder: index })) },
    },
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
  })

  return mapCard(card as RawCard)
}

export async function updateCard(app: FastifyInstance, userId: string, id: string, body: UpdateCardBody): Promise<CardResponse | null> {
  const existing = await app.prisma.card.findFirst({ where: { id, userId }, select: { id: true } })
  if (!existing) return null

  if (body.linkIds) {
    const ownedLinks = await app.prisma.platformLink.findMany({ where: { id: { in: body.linkIds }, userId }, select: { id: true } })
    if (ownedLinks.length !== body.linkIds.length) throw Object.assign(new Error('Link ownership mismatch'), { code: 'OWNERSHIP' })
  }

  await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.card.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        visibility: body.visibility,
        qrEnabled: body.qrEnabled,
      },
    })

    if (body.linkIds) {
      await tx.cardLink.deleteMany({ where: { cardId: id } })
      if (body.linkIds.length > 0) {
        await tx.cardLink.createMany({ data: body.linkIds.map((linkId, index) => ({ cardId: id, platformLinkId: linkId, displayOrder: index })) })
      }
    }
  })

  const updated = await app.prisma.card.findUnique({ where: { id }, include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } } })
  return updated ? mapCard(updated as RawCard) : null
}

export async function deleteCard(app: FastifyInstance, userId: string, id: string) {
  return await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.card.findFirst({ where: { id, userId } })
    if (!existing) return Object.assign(new Error('NotFound'), { code: 'NOT_FOUND' })

    const userCardCount = await tx.card.count({ where: { userId } })
    if (userCardCount <= 1) return Object.assign(new Error('Cannot delete last card'), { code: 'LAST_CARD' })

    if (existing.isDefault) {
      const oldestRemainingCard = await tx.card.findFirst({ where: { userId, id: { not: id } }, orderBy: { createdAt: 'asc' } })
      if (oldestRemainingCard) await tx.card.update({ where: { id: oldestRemainingCard.id }, data: { isDefault: true } })
    }

    await tx.card.delete({ where: { id } })
    return null
  })
}

export async function setDefaultCard(app: FastifyInstance, userId: string, id: string) {
  const existing = await app.prisma.card.findFirst({ where: { id, userId } })
  if (!existing) return null

  await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.card.updateMany({ where: { userId }, data: { isDefault: false } })
    await tx.card.update({ where: { id }, data: { isDefault: true } })
  })

  return { message: 'Default card updated' }
}

export async function addPlatformLink(app: FastifyInstance, userId: string, id: string, platformLinkId: string) {
  const [card, platformLink, existingLink, lastLink] = await Promise.all([
    app.prisma.card.findFirst({ where: { id, userId }, select: { id: true } }),
    app.prisma.platformLink.findFirst({ where: { id: platformLinkId, userId }, select: { id: true } }),
    app.prisma.cardLink.findUnique({ where: { cardId_platformLinkId: { cardId: id, platformLinkId } } }),
    app.prisma.cardLink.findFirst({ where: { cardId: id }, orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } }),
  ])

  if (!card) throw Object.assign(new Error('Card not found'), { code: 'CARD_NOT_FOUND' })
  if (!platformLink) throw Object.assign(new Error('Platform link not found'), { code: 'PLATFORM_LINK_NOT_FOUND' })
  if (existingLink) throw Object.assign(new Error('This platform link has already been added to the card'), { code: 'LINK_ALREADY_EXISTS' })

  await app.prisma.cardLink.create({ data: { cardId: id, platformLinkId, displayOrder: (lastLink?.displayOrder ?? -1) + 1 } })
}

export async function shareCard(app: FastifyInstance, userId: string, id: string) {
  const card = await app.prisma.card.findFirst({ where: { id, userId } })
  if (!card) throw Object.assign(new Error('Card not found'), { code: 'CARD_NOT_FOUND' })
  if (card.visibility === CardVisibility.PRIVATE) throw Object.assign(new Error('Private cards cannot be shared'), { code: 'CARD_PRIVATE' })

  return { shareUrl: `/cards/share/${card.slug}`, slug: card.slug }
}

export async function getSharedCard(app: FastifyInstance, slug: string) {
  const card = await app.prisma.card.findUnique({
    where: { slug },
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
  })

  if (!card || card.visibility === CardVisibility.PRIVATE) throw Object.assign(new Error('Card not found'), { code: 'CARD_NOT_FOUND' })
  return card
}

export async function generateCardQr(app: FastifyInstance, userId: string, id: string) {
  const card = await app.prisma.card.findFirst({ where: { id, userId } })
  if (!card) throw Object.assign(new Error('Card not found'), { code: 'CARD_NOT_FOUND' })
  if (card.visibility === CardVisibility.PRIVATE) throw Object.assign(new Error('Private cards cannot be shared'), { code: 'CARD_PRIVATE' })
  if (!card.qrEnabled) throw Object.assign(new Error('QR generation disabled for this card'), { code: 'QR_DISABLED' })

  const baseUrl = process.env.MOBILE_REDIRECT_URI || process.env.WEB_BASE_URL || ''
  return generateQRBuffer(`${baseUrl}/cards/share/${card.slug}`)
}

export async function cardAnalytics(app: FastifyInstance, userId: string, id: string) {
  const analytics = await app.prisma.card.findFirst({
    where: { id, userId },
    include: {
      views: {
        orderBy: { createdAt: 'desc' },
        include: {
          viewer: { select: { id: true, username: true, avatarUrl: true, displayName: true, role: true, accentColor: true } },
        },
      },
    },
  })

  if (!analytics) throw Object.assign(new Error('Card not found'), { code: 'CARD_NOT_FOUND' })
  return analytics
}
