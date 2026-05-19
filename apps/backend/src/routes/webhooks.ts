import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { encrypt } from '../utils/encryption.js';

// ─── Validation Schemas ───

const ALLOWED_EVENTS = ['card.viewed', 'contact.saved'] as const;

const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z
    .array(z.enum(ALLOWED_EVENTS))
    .min(1, 'At least one event is required'),
});

// ─── Route Definitions ───

export async function webhookRoutes(app: FastifyInstance) {
  // All webhook routes require authentication
  app.addHook('preHandler', app.authenticate);

  // ─── Register Webhook Endpoint ───
  /**
   * POST /api/webhooks
   * Creates a new webhook endpoint for the authenticated user.
   * Max 5 endpoints per user. Auto-generates and encrypts a secret.
   * Returns the plaintext secret once — user must store it.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = createWebhookSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    // Enforce max 5 endpoints per user
    const existingCount = await app.prisma.webhookEndpoint.count({
      where: { userId },
    });

    if (existingCount >= 5) {
      return reply.status(409).send({
        error: 'Maximum of 5 webhook endpoints allowed per user',
      });
    }

    // Generate a random secret and encrypt it for storage
    const plaintextSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSecret = encrypt(plaintextSecret);

    const endpoint = await app.prisma.webhookEndpoint.create({
      data: {
        userId,
        url: parsed.data.url,
        secret: encryptedSecret,
        events: parsed.data.events,
      },
    });

    return reply.status(201).send({
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      isActive: endpoint.isActive,
      createdAt: endpoint.createdAt,
      // Return the plaintext secret only at creation time
      secret: plaintextSecret,
    });
  });

  // ─── List Webhook Endpoints ───
  /**
   * GET /api/webhooks
   * Returns all webhook endpoints for the authenticated user.
   * The secret field is never returned.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    const endpoints = await app.prisma.webhookEndpoint.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return endpoints;
  });

  // ─── Delete Webhook Endpoint ───
  /**
   * DELETE /api/webhooks/:id
   * Removes a webhook endpoint. Only the owner can delete their own endpoints.
   */
  app.delete('/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const endpoint = await app.prisma.webhookEndpoint.findFirst({
      where: { id, userId },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Webhook endpoint not found' });
    }

    await app.prisma.webhookEndpoint.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── Delivery Logs ───
  /**
   * GET /api/webhooks/:id/deliveries
   * Returns paginated delivery logs for a specific endpoint.
   * Query params: ?page=1&limit=20
   */
  app.get('/:id/deliveries', async (
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: string; limit?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as any).id;
    const { id } = request.params;
    const page = Math.max(1, parseInt((request.query as any).page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((request.query as any).limit || '20', 10)));

    // Verify ownership
    const endpoint = await app.prisma.webhookEndpoint.findFirst({
      where: { id, userId },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Webhook endpoint not found' });
    }

    const [deliveries, total] = await Promise.all([
      app.prisma.webhookDelivery.findMany({
        where: { endpointId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      app.prisma.webhookDelivery.count({
        where: { endpointId: id },
      }),
    ]);

    return {
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  // ─── Rotate Secret ───
  /**
   * PATCH /api/webhooks/:id/rotate-secret
   * Generates a new secret for the endpoint.
   * Returns the new plaintext secret once — user must store it.
   */
  app.patch('/:id/rotate-secret', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const endpoint = await app.prisma.webhookEndpoint.findFirst({
      where: { id, userId },
    });

    if (!endpoint) {
      return reply.status(404).send({ error: 'Webhook endpoint not found' });
    }

    const plaintextSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSecret = encrypt(plaintextSecret);

    await app.prisma.webhookEndpoint.update({
      where: { id },
      data: { secret: encryptedSecret },
    });

    return {
      id: endpoint.id,
      secret: plaintextSecret,
      message: 'Secret rotated successfully. Store this secret — it will not be shown again.',
    };
  });
}
