import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (app: FastifyInstance) => {
  const redis = new Redis(config.redis.url, {
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
});
