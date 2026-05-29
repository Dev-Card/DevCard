import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'

export async function listCards(app: FastifyInstance, userId: string) {
  const cards = await app.prisma.card.findMany({
    where: { userId },
    take: 50,
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return cards.map((card: any) => ({ id: card.id, title: card.title, isDefault: card.isDefault, links: card.cardLinks.map((cl: any) => cl.platformLink) }))
}

export async function createCard(app: FastifyInstance, userId: string, body: { title: string; linkIds: string[] }) {
  if (body.linkIds.length > 0) {
    const ownedLinks = await app.prisma.platformLink.findMany({ where: { id: { in: body.linkIds }, userId }, select: { id: true } })
    if (ownedLinks.length !== body.linkIds.length) throw Object.assign(new Error('Link ownership mismatch'), { code: 'OWNERSHIP' })
  }

  const cardCount = await app.prisma.card.count({ where: { userId } })

  const card = await app.prisma.card.create({
    data: {
      userId,
      title: body.title,
      isDefault: cardCount === 0,
      cardLinks: { create: body.linkIds.map((linkId, index) => ({ platformLinkId: linkId, displayOrder: index })) },
    },
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
  })

  return { id: card.id, title: card.title, isDefault: card.isDefault, links: card.cardLinks.map((cl: any) => cl.platformLink) }
}

export async function updateCard(app: FastifyInstance, userId: string, id: string, body: { title?: string; linkIds?: string[] }) {
  const existing = await app.prisma.card.findFirst({ where: { id, userId } })
  if (!existing) return null

  if (body.title) {
    await app.prisma.card.update({ where: { id }, data: { title: body.title } })
  }

  if (body.linkIds) {
    if (body.linkIds.length > 0) {
      const ownedLinks = await app.prisma.platformLink.findMany({ where: { id: { in: body.linkIds }, userId }, select: { id: true } })
      if (ownedLinks.length !== body.linkIds.length) throw Object.assign(new Error('Link ownership mismatch'), { code: 'OWNERSHIP' })
    }

    const linkIds = body.linkIds
    await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cardLink.deleteMany({ where: { cardId: id } })
      if (linkIds.length > 0) {
        await tx.cardLink.createMany({ data: linkIds.map((linkId, index) => ({ cardId: id, platformLinkId: linkId, displayOrder: index })) })
      }
    })
  }

  const updated = await app.prisma.card.findUnique({ where: { id }, include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } } })
  return { id: updated!.id, title: updated!.title, isDefault: updated!.isDefault, links: updated!.cardLinks.map((cl: any) => cl.platformLink) }
}

export async function deleteCard(app: FastifyInstance, userId: string, id: string) {
  return await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.card.findFirst({ where: { id, userId } })
    if (!existing) return Object.assign(new Error('NotFound'), { code: 'NOT_FOUND' })

    const userCardCount = await tx.card.count({ where: { userId } })
    if (userCardCount <= 1) return Object.assign(new Error('Cannot delete last card'), { code: 'LAST_CARD' })

    if (existing.isDefault) {
      const oldestRemainingCard = await tx.card.findFirst({ where: { userId, id: { not: id } }, orderBy: { createdAt: 'asc' } })
      if (oldestRemainingCard) {
        await tx.card.update({ where: { id: oldestRemainingCard.id }, data: { isDefault: true } })
      }
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
