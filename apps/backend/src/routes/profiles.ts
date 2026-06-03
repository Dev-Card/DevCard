import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getProfileUrl } from '@devcard/shared';
import {
  updateProfileSchema,
  createLinkSchema,
  reorderLinksSchema,
} from '../utils/validators.js';

export async function profileRoutes(app: FastifyInstance) {
  // All profile routes require auth
  app.addHook('preHandler', app.authenticate);

  // ─── Get Own Profile ───

  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformLinks: {
          orderBy: { displayOrder: 'asc' },
        },
        cards: {
          where: { isDefault: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { provider, providerId, ...profileData } = user;
    return {
      ...profileData,
      defaultCardId: user.cards[0]?.id || null,
    };
  });

  // ─── Update Profile ───

  app.put('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = updateProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    // Check username uniqueness if changing
    // Note: For production, consider adding a timestamp/version field to handle
    // race conditions where two users might try to claim the same username simultaneously.
    if (parsed.data.username) {
      const existing = await app.prisma.user.findFirst({
        where: {
          username: parsed.data.username,
          NOT: { id: userId },
        },
      });
      if (existing) {
        return reply.status(409).send({ error: 'Username already taken' });
      }
    }

    const updated = await app.prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        pronouns: true,
        role: true,
        company: true,
        avatarUrl: true,
        accentColor: true,
      },
    });

    return updated;
  });

  // ─── Add Platform Link ───

  app.post('/me/links', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = createLinkSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    // Auto-generate URL from platform registry if not provided
    const url = parsed.data.url || getProfileUrl(parsed.data.platform, parsed.data.username);

    // Get next display order
    const maxOrder = await app.prisma.platformLink.aggregate({
      where: { userId },
      _max: { displayOrder: true },
    });

    const link = await app.prisma.platformLink.create({
      data: {
        userId,
        platform: parsed.data.platform,
        username: parsed.data.username,
        url,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      },
    });

    return reply.status(201).send(link);
  });

  // ─── Update Platform Link ───

  app.put('/me/links/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const existing = await app.prisma.platformLink.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    const parsed = createLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const url = parsed.data.url || getProfileUrl(parsed.data.platform, parsed.data.username);

    const updated = await app.prisma.platformLink.update({
      where: { id },
      data: {
        platform: parsed.data.platform,
        username: parsed.data.username,
        url,
      },
    });

    return updated;
  });

  // ─── Delete Platform Link ───

  app.delete('/me/links/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const existing = await app.prisma.platformLink.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    await app.prisma.platformLink.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── Reorder Links ───

  app.put('/me/links/reorder', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = reorderLinksSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    await app.prisma.$transaction(
      parsed.data.links.map((link) =>
        app.prisma.platformLink.updateMany({
          where: { id: link.id, userId },
          data: { displayOrder: link.displayOrder },
        })
      )
    );

    return { message: 'Links reordered' };
  });
}
