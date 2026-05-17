import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getProfileUrl } from '@devcard/shared';
import { createLinkSchema } from '../utils/validators.js';

const createApiKeySchema = z.object({
  label: z.string().max(100).optional(),
});

const platformLinkSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    platform: { type: 'string' },
    username: { type: 'string' },
    url: { type: 'string' },
    displayOrder: { type: 'number' },
  },
  required: ['id', 'platform', 'username', 'url', 'displayOrder'],
};

const fullProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    username: { type: 'string' },
    displayName: { type: ['string', 'null'] },
    bio: { type: ['string', 'null'] },
    pronouns: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    company: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
    accentColor: { type: 'string' },
    platformLinks: { type: 'array', items: platformLinkSchema },
    defaultCardId: { type: ['string', 'null'] },
  },
  required: ['id', 'username', 'accentColor', 'platformLinks', 'defaultCardId'],
};

const publicProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    displayName: { type: ['string', 'null'] },
    bio: { type: ['string', 'null'] },
    pronouns: { type: ['string', 'null'] },
    role: { type: ['string', 'null'] },
    company: { type: ['string', 'null'] },
    avatarUrl: { type: ['string', 'null'] },
    accentColor: { type: 'string' },
    platformLinks: { type: 'array', items: platformLinkSchema },
    defaultCardId: { type: ['string', 'null'] },
  },
  required: ['id', 'username', 'accentColor', 'platformLinks', 'defaultCardId'],
};

const createApiKeySchemaDefinition = {
  type: 'object',
  properties: {
    label: { type: 'string' },
  },
  additionalProperties: false,
};

const apiKeyResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    label: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    lastUsed: { type: ['string', 'null'], format: 'date-time' },
    revokedAt: { type: ['string', 'null'], format: 'date-time' },
    key: { type: 'string' },
  },
  required: ['id', 'createdAt', 'key'],
};

export async function v1Routes(app: FastifyInstance) {
  const apiKeyRoutes = async (router: FastifyInstance) => {
    router.addHook('preHandler', app.authenticate);

    router.post(
      '/',
      {
        schema: {
          tags: ['Public API'],
          body: createApiKeySchemaDefinition,
          response: { 201: apiKeyResponseSchema },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = (request.user as any).id;
        const parsed = createApiKeySchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
        }

        const secret = crypto.randomBytes(32).toString('hex');
        const keyHash = await bcrypt.hash(secret, 10);
        const label = typeof parsed.data.label === 'string' ? parsed.data.label : null;
        const apiKey = await app.prisma.apiKey.create({
          data: {
            userId,
            keyHash,
            label,
          },
        });

        return reply.status(201).send({
          id: apiKey.id,
          label: apiKey.label,
          createdAt: apiKey.createdAt,
          lastUsed: apiKey.lastUsed,
          revokedAt: apiKey.revokedAt,
          key: `${apiKey.id}.${secret}`,
        });
      }
    );

    router.delete(
      '/:id',
      {
        schema: {
          tags: ['Public API'],
          params: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
          },
          response: { 204: { type: 'null' } },
        },
      },
      async (request, reply) => {
        const userId = (request.user as any).id;
        const { id } = request.params;

        const current = await app.prisma.apiKey.findUnique({ where: { id } });
        if (!current || current.userId !== userId) {
          return reply.status(404).send({ error: 'API key not found' });
        }

        await app.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
        return reply.status(204).send();
      }
    );
  };

  const profileRoutes = async (router: FastifyInstance) => {
    router.get(
      '/me',
      {
        preHandler: app.verifyApiKey,
        schema: {
          tags: ['Public API'],
          security: [{ bearerAuth: [] }],
          response: { 200: fullProfileSchema },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.apiKey?.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        const user = await app.prisma.user.findUnique({
          where: { id: userId },
          include: {
            platformLinks: { orderBy: { displayOrder: 'asc' } },
            cards: { where: { isDefault: true }, select: { id: true }, take: 1 },
          },
        });

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          pronouns: user.pronouns,
          role: user.role,
          company: user.company,
          avatarUrl: user.avatarUrl,
          accentColor: user.accentColor,
          platformLinks: user.platformLinks,
          defaultCardId: user.cards[0]?.id || null,
        };
      }
    );

    router.put(
      '/me/links',
      {
        preHandler: app.verifyApiKey,
        schema: {
          tags: ['Public API'],
          security: [{ bearerAuth: [] }],
          body: {
            type: 'object',
            properties: {
              platform: { type: 'string' },
              username: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['platform', 'username'],
          },
          response: { 201: platformLinkSchema },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.apiKey?.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

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
      }
    );

    router.delete(
      '/me/links/:id',
      {
        preHandler: app.verifyApiKey,
        schema: {
          tags: ['Public API'],
          security: [{ bearerAuth: [] }],
          params: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
          },
          response: { 204: { type: 'null' } },
        },
      },
      async (request, reply) => {
        const userId = request.apiKey?.userId;
        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        const { id } = request.params;
        const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } });
        if (!existing) {
          return reply.status(404).send({ error: 'Link not found' });
        }

        await app.prisma.platformLink.delete({ where: { id } });
        return reply.status(204).send();
      }
    );

    router.get(
      '/:username',
      {
        schema: {
          tags: ['Public API'],
          params: {
            type: 'object',
            properties: { username: { type: 'string' } },
            required: ['username'],
          },
          response: { 200: publicProfileSchema },
        },
      },
      async (request, reply) => {
        const { username } = request.params;
        const user = await app.prisma.user.findUnique({
          where: { username },
          include: {
            platformLinks: { orderBy: { displayOrder: 'asc' } },
            cards: { where: { isDefault: true }, select: { id: true }, take: 1 },
          },
        });

        if (!user) {
          return reply.status(404).send({ error: 'Profile not found' });
        }

        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          pronouns: user.pronouns,
          role: user.role,
          company: user.company,
          avatarUrl: user.avatarUrl,
          accentColor: user.accentColor,
          platformLinks: user.platformLinks,
          defaultCardId: user.cards[0]?.id || null,
        };
      }
    );
  };

  await app.register(apiKeyRoutes, { prefix: '/keys' });
  await app.register(profileRoutes, { prefix: '/profiles' });

  app.get('/openapi.json', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(app.swagger());
  });
}
