import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createCardSchema, updateCardSchema } from '../utils/validators.js';

export async function cardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // ─── List Cards ───

  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    const cards = await app.prisma.card.findMany({
      where: { userId },
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
      links: card.cardLinks.map((cl) => cl.platformLink),
    }));
  });

  // ─── Create Card ───

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = createCardSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    // Check if user's first card → make it default
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
      links: card.cardLinks.map((cl) => cl.platformLink),
    });
  });

  // ─── Update Card ───

  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

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

    // Update card title
    if (parsed.data.title) {
      await app.prisma.card.update({
        where: { id },
        data: { title: parsed.data.title },
      });
    }

    // Update card links if provided
    if (parsed.data.linkIds) {
      // Remove existing links
      await app.prisma.cardLink.deleteMany({ where: { cardId: id } });
      // Add new links
      await app.prisma.cardLink.createMany({
        data: parsed.data.linkIds.map((linkId, index) => ({
          cardId: id,
          platformLinkId: linkId,
          displayOrder: index,
        })),
      });
    }

    // Fetch updated card
    const updated = await app.prisma.card.findUnique({
      where: { id },
      include: {
        cardLinks: {
          include: { platformLink: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return {
      id: updated!.id,
      title: updated!.title,
      isDefault: updated!.isDefault,
      links: updated!.cardLinks.map((cl) => cl.platformLink),
    };
  });

  // ─── Delete Card ───

  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const existing = await app.prisma.card.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    await app.prisma.card.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── Set Default Card ───

  app.put('/:id/default', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const existing = await app.prisma.card.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    // Unset all other defaults
    await app.prisma.card.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this one
    await app.prisma.card.update({
      where: { id },
      data: { isDefault: true },
    });

    return { message: 'Default card updated' };
  });
}
