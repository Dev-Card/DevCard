import { createHash } from 'node:crypto'
import { handleDbError } from '../utils/error.util.js'
import { addPlatformLinkSchema, createCardSchema, updateCardSchema } from '../utils/validators.js'
import * as cardService from '../services/cardService.js'

import type { CardResponse, CreateCardBody, UpdateCardBody } from '../services/cardService.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

interface CardParams {
  id: string
}

function getUserId(request: FastifyRequest): string {
  return (request.user as { id: string }).id
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex')
}

export async function cardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const server = request.server as any
    if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
    if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
    try { await request.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
  })

  app.get('/', async (request: FastifyRequest, reply: FastifyReply): Promise<CardResponse[] | void> => {
    try {
      return await cardService.listCards(app, getUserId(request))
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  })

  app.post('/', async (request: FastifyRequest<{ Body: CreateCardBody }>, reply: FastifyReply): Promise<CardResponse | void> => {
    const parsed = createCardSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() })

    try {
      const card = await cardService.createCard(app, getUserId(request), parsed.data)
      return reply.status(201).send(card)
    } catch (error: any) {
      if (error?.code === 'OWNERSHIP') return reply.status(403).send({ error: 'One or more links do not belong to your account' })
      return handleDbError(error, request, reply)
    }
  })

  async function updateCard(request: FastifyRequest<{ Params: CardParams; Body: UpdateCardBody }>, reply: FastifyReply): Promise<CardResponse | void> {
    const parsed = updateCardSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() })

    try {
      const updated = await cardService.updateCard(app, getUserId(request), request.params.id, parsed.data)
      if (!updated) return reply.status(404).send({ error: 'Card not found' })
      return reply.status(200).send(updated)
    } catch (error: any) {
      if (error?.code === 'OWNERSHIP') return reply.status(403).send({ error: 'One or more links do not belong to your account' })
      return handleDbError(error, request, reply)
    }
  }

  app.put('/:id', updateCard)
  app.put('/:id/update', updateCard)

  async function deleteCard(request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<void> {
    try {
      const res = await cardService.deleteCard(app, getUserId(request), request.params.id)
      if (res && (res as any).code === 'NOT_FOUND') return reply.status(404).send({ error: 'Card not found' })
      if (res && (res as any).code === 'LAST_CARD') return reply.status(400).send({ error: 'Cannot delete the last remaining card. A user must have at least one card.' })
      return reply.status(204).send()
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  }

  app.delete('/:id', deleteCard)
  app.delete('/:id/delete', deleteCard)

  app.put('/:id/default', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<object | void> => {
    try {
      const resp = await cardService.setDefaultCard(app, getUserId(request), request.params.id)
      if (!resp) return reply.status(404).send({ error: 'Card not found' })
      return reply.status(200).send(resp)
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  })

  app.put('/:id/platform-link', async (request: FastifyRequest<{ Params: CardParams; Body: { platformLinkId: string } }>, reply: FastifyReply): Promise<void> => {
    const parsed = addPlatformLinkSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() })

    try {
      await cardService.addPlatformLink(app, getUserId(request), request.params.id, parsed.data.platformLinkId)
      return reply.status(200).send({ message: 'Platform link added successfully' })
    } catch (error: any) {
      if (error?.code === 'CARD_NOT_FOUND') return reply.status(404).send({ error: error.message })
      if (error?.code === 'PLATFORM_LINK_NOT_FOUND') return reply.status(403).send({ error: error.message })
      if (error?.code === 'LINK_ALREADY_EXISTS') return reply.status(409).send({ error: error.message })
      return handleDbError(error, request, reply)
    }
  })

  app.post('/:id/share', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply) => {
    try {
      return reply.status(200).send(await cardService.shareCard(app, getUserId(request), request.params.id))
    } catch (error: any) {
      if (error?.code === 'CARD_NOT_FOUND') return reply.status(404).send({ error: error.message })
      if (error?.code === 'CARD_PRIVATE') return reply.status(403).send({ error: error.message })
      return handleDbError(error, request, reply)
    }
  })

  app.get('/share/:slug', async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    try {
      const card = await cardService.getSharedCard(app, request.params.slug)
      const viewerId = getUserId(request)

      await app.prisma.$transaction([
        app.prisma.card.update({ where: { id: card.id }, data: { viewCount: { increment: 1 } } }),
        app.prisma.cardView.create({
          data: {
            cardId: card.id,
            ownerId: card.userId,
            viewerId,
            source: 'link',
            viewerIp: hashIp(request.ip),
            viewerAgent: request.headers['user-agent'] ?? 'unknown',
          },
        }),
      ])

      return reply.status(200).send(card)
    } catch (error: any) {
      if (error?.code === 'CARD_NOT_FOUND') return reply.status(404).send({ error: error.message })
      return handleDbError(error, request, reply)
    }
  })

  app.get('/:id/qr', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply) => {
    try {
      const qrImage = await cardService.generateCardQr(app, getUserId(request), request.params.id)
      return reply.type('image/png').send(qrImage)
    } catch (error: any) {
      if (error?.code === 'CARD_NOT_FOUND') return reply.status(404).send({ error: error.message })
      if (error?.code === 'CARD_PRIVATE' || error?.code === 'QR_DISABLED') return reply.status(403).send({ error: error.message })
      return handleDbError(error, request, reply)
    }
  })

  app.get('/:id/analytics', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply) => {
    try {
      return reply.status(200).send(await cardService.cardAnalytics(app, getUserId(request), request.params.id))
    } catch (error: any) {
      if (error?.code === 'CARD_NOT_FOUND') return reply.status(404).send({ error: error.message })
      return handleDbError(error, request, reply)
    }
  })
}
