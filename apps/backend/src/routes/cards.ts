import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Card } from '@devcard/shared';
import { createCardSchema, updateCardSchema } from '../utils/validators.js';
import { handleDbError } from '../utils/error.util.js';

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

export async function cardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // ─── List Cards ───

  app.get('/', async (request: FastifyRequest, reply: FastifyReply): Promise<Card[] | void> => {
    const userId = (request.user as { id: string }).id;

    try {
      const cards = await app.prisma.card.findMany({
        where: { userId },
        take: 50,
        include: {
          cardLinks: {
            include: { platformLink: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return cards.map((card) => ({
        id: card.id,
        title: card.title,
        isDefault: card.isDefault,
        links: card.cardLinks.map((cl) => cl.platformLink) as any,
      }));
    } catch (error) {
      return handleDbError(error, request, reply);
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
      const cardCount = await app.prisma.card.count({ where: { userId } });

      const card = await app.prisma.card.create({
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

      return reply.status(201).send({
        id: card.id,
        title: card.title,
        isDefault: card.isDefault,
        links: card.cardLinks.map((cl) => cl.platformLink) as any,
      });
    } catch (error) {
      return handleDbError(error, request, reply);
    }
  });

  // ─── Update Card ───

  app.put('/:id', async (request: FastifyRequest<{ Params: CardParams; Body: UpdateCardBody }>, reply: FastifyReply): Promise<Card | void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const existing = await app.prisma.card.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      const parsed = updateCardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      if (parsed.data.title) {
        await app.prisma.card.update({
          where: { id },
          data: { title: parsed.data.title },
        });
      }

      if (parsed.data.linkIds) {
        // Ownership check runs before any write so a foreign linkId is always
        // caught before existing links are touched.
        if (parsed.data.linkIds.length > 0) {
          const ownedLinks = await app.prisma.platformLink.findMany({
            where: { id: { in: parsed.data.linkIds }, userId },
            select: { id: true },
          });

          if (ownedLinks.length !== parsed.data.linkIds.length) {
            return reply.status(403).send({ error: 'One or more links do not belong to your account' });
          }
        }

        // Replace links inside a transaction so the card is never left linkless
        // when deleteMany succeeds but createMany subsequently fails.
        const linkIds = parsed.data.linkIds;
        await app.prisma.$transaction(async (tx) => {
          await tx.cardLink.deleteMany({ where: { cardId: id } });
          if (linkIds.length > 0) {
            await tx.cardLink.createMany({
              data: linkIds.map((linkId, index) => ({
                cardId: id,
                platformLinkId: linkId,
                displayOrder: index,
              })),
            });
          }
        });
      }

      const updated = await app.prisma.card.findUnique({
        where: { id },
        include: {
          cardLinks: {
            include: { platformLink: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      const response: Card = {
        id: updated!.id,
        title: updated!.title,
        isDefault: updated!.isDefault,
        links: updated!.cardLinks.map((cl) => cl.platformLink) as any,
      };

      return response;
    } catch (error) {
      return handleDbError(error, request, reply);
    }
  });

  // ─── Delete Card ───

  app.delete('/:id', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const existing = await app.prisma.card.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        reply.status(404).send({ error: 'Card not found' });
        return;
      }

      // Prevent deleting the last card — every user must retain at least one.
      const userCardCount = await app.prisma.card.count({ where: { userId } });
      if (userCardCount <= 1) {
        reply.status(400).send({ error: 'Cannot delete the last remaining card. A user must have at least one card.' });
        return;
      }

      // If the card being deleted is the default, promote the next-oldest card
      // before deletion so the user always has an active default.
      if (existing.isDefault) {
        const oldestRemainingCard = await app.prisma.card.findFirst({
          where: { userId, id: { not: id } },
          orderBy: { createdAt: 'asc' },
        });

        if (oldestRemainingCard) {
          await app.prisma.card.update({
            where: { id: oldestRemainingCard.id },
            data: { isDefault: true },
          });
        }
      }

      await app.prisma.card.delete({ where: { id } });
      reply.status(204).send();
    } catch (error) {
      return handleDbError(error, request, reply);
    }
  });

  // ─── Set Default Card ───

  app.put('/:id/default', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<object | void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const existing = await app.prisma.card.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Card not found' });
      }

      // Clear then set in a single transaction so there is never a window where
      // the user has zero default cards if the second write fails.
      await app.prisma.$transaction(async (tx) => {
        await tx.card.updateMany({ where: { userId }, data: { isDefault: false } });
        await tx.card.update({ where: { id }, data: { isDefault: true } });
      });

      return { message: 'Default card updated' };
    } catch (error) {
      return handleDbError(error, request, reply);
    }
  });
}
