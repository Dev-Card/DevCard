import { handleDbError } from '../utils/error.util.js';
import { createCardSchema, updateCardSchema } from '../utils/validators.js';
import * as cardService from '../services/cardService'

import type { Card } from '@devcard/shared';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';


interface CreateCardBody {
  title: string;
  linkIds: string[];
}

interface UpdateCardBody {
  title?: string;
  linkIds?: string[];
}

interface CardParams {
  id: string;
}

interface PlatformLink {
  id: string;
  userId: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
  createdAt: Date;
}

interface CardLinkWithPlatform {
  id: string;
  cardId: string;
  platformLinkId: string;
  displayOrder: number;
  platformLink: PlatformLink;
}

interface CardWithLinks {
  id: string;
  userId: string;
  title: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  cardLinks: CardLinkWithPlatform[];
}

export async function cardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const server = request.server as any;
    if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
    if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
    try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
  });

  // ─── List Cards ───

  app.get('/', async (request: FastifyRequest, reply: FastifyReply): Promise<Card[] | void> => {
    const userId = (request.user as { id: string }).id;
    try {
      return await cardService.listCards(app, userId)
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  });

  // ─── Create Card ───

  app.post('/', async (request: FastifyRequest<{ Body: CreateCardBody }>, reply: FastifyReply): Promise<Card | void> => {
    const userId = (request.user as { id: string }).id;
    const parsed = createCardSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    try {
      // Verify every supplied link belongs to the authenticated user before any write.
      // A count mismatch means at least one ID is foreign — reject before touching the DB.
      if (parsed.data.linkIds.length > 0) {
        const ownedLinks = await app.prisma.platformLink.findMany({
          where: { id: { in: parsed.data.linkIds }, userId },
          select: { id: true },
        });

        if (ownedLinks.length !== parsed.data.linkIds.length) {
          return reply.status(403).send({ error: 'One or more links do not belong to your account' });
        }
      }

      // Check if user's first card -> make it default.
      // Prisma wraps the nested cardLinks.create inside card.create in a single
      // implicit transaction, so either both the card and its links are written or neither is.
      const card = await app.prisma.$transaction(async (tx) => {
  const cardCount = await tx.card.count({
    where: { userId },
  });

  return tx.card.create({
        data: {
          userId,
          title: parsed.data.title,
          isDefault: cardCount === 0,
          cardLinks: {
            create: parsed.data.linkIds.map((linkId, index) => ({
              platformLinkId: linkId,
              displayOrder: index,
            })),
          },
        },
        include: {
          cardLinks: {
            include: { platformLink: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });
    }};
      const response = {
        id: card.id, 
        title: card.title,
        isDefault: card.isDefault,
        links: card.cardLinks.map((cl: CardLinkWithPlatform) => cl.platformLink),
      }

      return reply.status(201).send(response);
    } catch (error) {
      return handleDbError(error, request, reply);
      const card = await cardService.createCard(app, userId, parsed.data)
      return reply.status(201).send(card)
    } catch (error: any) {
      if (error?.code === 'OWNERSHIP') return reply.status(403).send({ error: 'One or more links do not belong to your account' })
      return handleDbError(error, request, reply)
    }
  });

  // ─── Update Card ───

  app.put('/:id', async (request: FastifyRequest<{ Params: CardParams; Body: UpdateCardBody }>, reply: FastifyReply): Promise<Card | void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const parsed = updateCardSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() })
      const updated = await cardService.updateCard(app, userId, id, parsed.data)
      if (!updated) return reply.status(404).send({ error: 'Card not found' })
      return updated
    } catch (error: any) {
      if (error?.code === 'OWNERSHIP') return reply.status(403).send({ error: 'One or more links do not belong to your account' })
      return handleDbError(error, request, reply)
    }
  });

  // ─── Delete Card ───

  app.delete('/:id', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const res = await cardService.deleteCard(app, userId, id)
      if (res && (res as any).code === 'NOT_FOUND') return reply.status(404).send({ error: 'Card not found' })
      if (res && (res as any).code === 'LAST_CARD') return reply.status(400).send({ error: 'Cannot delete the last remaining card. A user must have at least one card.' })
      return reply.status(204).send()
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  });

  // ─── Set Default Card ───

  app.put('/:id/default', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<object | void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const resp = await cardService.setDefaultCard(app, userId, id)
      if (!resp) return reply.status(404).send({ error: 'Card not found' })
      return resp
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  });
}
