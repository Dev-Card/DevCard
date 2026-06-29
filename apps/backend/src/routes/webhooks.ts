import crypto from 'node:crypto';

import { z } from 'zod';

import { encrypt } from '../utils/encryption.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// ─── Validation Schemas ───

const ALLOWED_EVENTS = ['card.viewed', 'contact.saved'] as const;

const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z
    .array(z.enum(ALLOWED_EVENTS))
    .min(1, 'At least one event is required'),
});

// ─── Route Definitions ───

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // All webhook routes require authentication
  app.addHook('preHandler', async (request, reply) => {
    await app.authenticate(request, reply);
  });

  // ─── Register Webhook Endpoint ───
  /**
   * POST /api/webhooks
   * Creates a new webhook endpoint for the authenticated user.
   * Max 5 endpoints per user. Auto-generates and encrypts a secret.
   * Returns the plaintext secret once — user must store it.
   */
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: { type: 'string', format: 'uri' },
          events: {
            type: 'array',
            items: { type: 'string', enum: ['card.viewed', 'contact.saved'] },
            minItems: 1,
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const parsed = createWebhookSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    try {
      const endpoint = await app.prisma.$transaction(async (tx: any) => {
        const existingCount = await tx.webhookEndpoint.count({
          where: { userId },
        });

        if (existingCount >= 5) {
          throw Object.assign(new Error('Maximum of 5 webhook endpoints allowed per user'), { statusCode: 409 });
        }

        const plaintextSecret = crypto.randomBytes(32).toString('hex');
        const encryptedSecret = encrypt(plaintextSecret);

        const created = await tx.webhookEndpoint.create({
          data: {
            userId,
            url: parsed.data.url,
            secret: encryptedSecret,
            events: parsed.data.events,
          },
        });

        return { ...created, plaintextSecret };
      });

      return reply.status(201).send({
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt,
        secret: endpoint.plaintextSecret,
      });
    } catch (err: any) {
      if (err.statusCode === 409) {
        return reply.status(409).send({ error: err.message });
      }
      throw err;
    }
  });

  // ─── List Webhook Endpoints ───
  /**
   * GET /api/webhooks
   * Returns all webhook endpoints for the authenticated user.
   * The secret field is never returned.
   */
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const limit = (request.query as any).limit ?? 20;

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
      take: limit,
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