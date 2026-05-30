import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getProfileUrl } from '@devcard/shared';
import { updateProfileSchema, createLinkSchema, reorderLinksSchema } from '../utils/validators.js';
import { getErrorMessage } from '../utils/error.util.js';
import * as profileService from '../services/profileService'

// ── Response types ────────────────────────────────────────────────────────────
// Declared explicitly so the API contract is visible without tracing through
// Prisma's generic return types.  Follows the convention in public.ts.

type ProfileUpdateResponse = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
};

export async function profileRoutes(app: FastifyInstance) {
  // All profile routes require auth
  app.addHook('preHandler', async (request, reply) => {
    const server = request.server as any;
    if (typeof server?.authenticate === 'function') {
      await server.authenticate(request, reply);
      return;
    }
    if (typeof (app as any).authenticate === 'function') {
      await (app as any).authenticate(request, reply);
      return;
    }
    try {
      await request.jwtVerify();
    } catch (e) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // ─── Get Own Profile ───

  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const user = await profileService.getOwnProfile(app, userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  });

  // ─── Update Profile ───

  app.put('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = updateProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    // Fast-path uniqueness check. This read-before-write eliminates the common
    // case (clearly taken username) without touching the write path, but it
    // cannot prevent the race window between two concurrent requests that both
    // pass this check simultaneously. The unique constraint on the DB is the
    // authoritative guard — P2002 below is the definitive conflict signal.
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

    try {
      const response = await profileService.updateProfile(app, userId, parsed.data)
      return response
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.status(409).send({ error: 'Username already taken' })
      app.log.error({ err }, 'DB error in PUT /profiles/me')
      return reply.status(500).send({ error: 'Internal server error' })
    }
  });

  // ─── Add Platform Link ───

  app.post('/me/links', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = createLinkSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    try {
      const link = await profileService.createPlatformLink(app, userId, parsed.data)
      return reply.status(201).send(link)
    } catch (err: any) {
      app.log.error({ err }, 'Failed to create platform link')
      return reply.status(500).send({ error: 'Internal server error' })
    }
  });

  // ─── Update Platform Link ───

  app.put('/me/links/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const parsedReq = createLinkSchema.safeParse(request.body)
    if (!parsedReq.success) return reply.status(400).send({ error: 'Validation failed', details: parsedReq.error.flatten() })
    try {
      const updated = await profileService.updatePlatformLink(app, userId, id, parsedReq.data)
      if (!updated) return reply.status(404).send({ error: 'Link not found' })
      return updated
    } catch (err: any) {
      app.log.error({ err }, 'Failed to update platform link')
      return reply.status(500).send({ error: 'Internal server error' })
    }
  });

  // ─── Delete Platform Link ───

  app.delete('/me/links/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    try {
      const deleted = await profileService.deletePlatformLink(app, userId, id)
      if (!deleted) return reply.status(404).send({ error: 'Link not found' })
      return reply.status(204).send()
    } catch (err: any) {
      app.log.error({ err }, 'Failed to delete platform link')
      return reply.status(500).send({ error: 'Internal server error' })
    }
  });

  // ─── Reorder Links ───

  app.put('/me/links/reorder', async (request: FastifyRequest, reply: FastifyReply) => {
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
