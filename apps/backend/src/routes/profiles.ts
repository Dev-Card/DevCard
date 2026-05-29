/**
 * routes/profiles.ts  (updated)
 *
 * Rate limit changes:
 *  - All routes behind app.authenticate are MODERATE (60 req/min per user ID).
 *  - The hook-level `preHandler` for authenticate is preserved.
 *  - Each route now carries a per-route rate limit config so the correct
 *    per-user key is used (the global hook runs first, populating request.user,
 *    which the key generator then reads).
 *
 * No business logic modified.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getProfileUrl } from '@devcard/shared';
import {
  updateProfileSchema,
  createLinkSchema,
  reorderLinksSchema,
} from '../utils/validators.js';
import { moderateRateLimit } from '../plugins/rate-limit.js';

export async function profileRoutes(app: FastifyInstance) {
  // All profile routes require auth — preHandler populates request.user before
  // the rate-limit key generator runs.
  app.addHook('preHandler', app.authenticate);

  // ─── Get Own Profile ───
  app.get('/me', moderateRateLimit, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      include: {
        platformLinks: { orderBy: { displayOrder: 'asc' } },
        cards: {
          where: { isDefault: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    const { provider, providerId, ...profileData } = user;
    return { ...profileData, defaultCardId: user.cards[0]?.id || null };
  });

  // ─── Update Profile ───
  app.put('/me', moderateRateLimit, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = updateProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    if (parsed.data.username) {
      const existing = await app.prisma.user.findFirst({
        where: { username: parsed.data.username, NOT: { id: userId } },
      });
      if (existing) return reply.status(409).send({ error: 'Username already taken' });
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
  app.post('/me/links', moderateRateLimit, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = createLinkSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const url = parsed.data.url || getProfileUrl(parsed.data.platform, parsed.data.username);

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
  app.put('/me/links/:id', moderateRateLimit, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } });
    if (!existing) return reply.status(404).send({ error: 'Link not found' });

    const parsed = createLinkSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const url = parsed.data.url || getProfileUrl(parsed.data.platform, parsed.data.username);

    const updated = await app.prisma.platformLink.update({
      where: { id },
      data: { platform: parsed.data.platform, username: parsed.data.username, url },
    });

    return updated;
  });

  // ─── Delete Platform Link ───
  app.delete('/me/links/:id', moderateRateLimit, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } });
    if (!existing) return reply.status(404).send({ error: 'Link not found' });

    await app.prisma.platformLink.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── Reorder Links ───
  app.put('/me/links/reorder', moderateRateLimit, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsedReq = reorderLinksSchema.safeParse(request.body)
    if (!parsedReq.success) return reply.status(400).send({ error: 'Validation failed', details: parsedReq.error.flatten() })
    try {
      const resp = await profileService.reorderLinks(app, userId, parsedReq.data.links)
      return resp
    } catch (err: any) {
      app.log.error({ err }, 'Failed to reorder links')
      return reply.status(500).send({ error: 'Internal server error' })
    }
  });
}
