import fp from 'fastify-plugin';
import * as bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    verifyApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    apiKey?: {
      id: string;
      userId: string;
    };
  }
}

export const apiKeyPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('apiKey', undefined as any);

  app.decorate('verifyApiKey', async function (request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const token = header.slice(7).trim();
    const [id, secret] = token.split('.', 2);
    if (!id || !secret) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const apiKey = await app.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.revokedAt) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const isMatch = await bcrypt.compare(secret, apiKey.keyHash);
    if (!isMatch) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    await app.prisma.apiKey.update({ where: { id }, data: { lastUsed: new Date() } });
    request.apiKey = { id: apiKey.id, userId: apiKey.userId };

    // Separate API key rate limiting for versioned public API traffic.
    if (app.redis) {
      const windowSeconds = 60;
      const rateKey = `rate:api:${apiKey.id}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
      const count = await app.redis.incr(rateKey);
      if (count === 1) {
        await app.redis.expire(rateKey, windowSeconds);
      }
      if (count > 300) {
        return reply.status(429).send({ error: 'Too Many Requests' });
      }
    }
  });
});
