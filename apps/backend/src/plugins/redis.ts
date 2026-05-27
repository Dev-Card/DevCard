/**
 * plugins/redis.ts  (updated)
 *
 * Only change from the original: fp() is given a name option (`'redis-plugin'`)
 * so that the rate-limit plugin can declare it as a dependency and Fastify's
 * plugin system guarantees load order.
 */

import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(
  async (app: FastifyInstance) => {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      app.log.info('🔴 Redis connected');
    } catch (err) {
      app.log.warn('⚠️  Redis connection failed — running without cache');
    }

    app.decorate('redis', redis);

    app.addHook('onClose', async () => {
      redis.disconnect();
    });
  },
  { name: 'redis-plugin' } // ← required so rate-limit plugin can declare dependency
);
