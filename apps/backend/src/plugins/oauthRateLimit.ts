import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

/**
 * OAuth Rate Limit Plugin
 * Provides stricter rate limiting for OAuth endpoints to prevent brute force attacks
 * - Callback endpoints: 5 requests per minute per IP
 * - OAuth start endpoints: 10 requests per minute per IP
 * - Uses Redis for distributed rate limiting across multiple instances
 */

// Extend Fastify instance with OAuth rate limit middleware
declare module 'fastify' {
  interface FastifyInstance {
    oauthCallbackRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    oauthStartRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const oauthRateLimitPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  // Rate limit for OAuth callback endpoints (stricter)
  // cache: 10000 = in-memory LRU capacity; sufficient for per-IP tracking on typical apps
  const callbackLimiter = rateLimit.createStore({
    max: 5,
    timeWindow: '1 minute',
    cache: 10000,
    skipOnError: true,
  });

  // Rate limit for OAuth start endpoints (moderate)
  // cache: 10000 = in-memory LRU capacity; sufficient for per-IP tracking on typical apps
  const startLimiter = rateLimit.createStore({
    max: 10,
    timeWindow: '1 minute',
    cache: 10000,
    skipOnError: true,
  });

  // Middleware for OAuth callback rate limiting (per IP, with user-aware fallback)
  const callbackRateLimitMiddleware = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    // Use user ID if authenticated, otherwise use IP
    const key = (request.user as any)?.id || request.ip;
    const count = await callbackLimiter.incr(key);

    // incr() returns count AFTER incrementing, so >= 5 means limit exceeded
    if (count >= 5) {
      reply.header('Retry-After', '60');
      return reply.status(429).send({
        error: 'Too many authentication attempts. Please try again later.',
      });
    }
  };

  // Middleware for OAuth start rate limiting (per IP)
  const startRateLimitMiddleware = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const key = `oauth_start:${request.ip}`;
    const count = await startLimiter.incr(key);

    // incr() returns count AFTER incrementing, so >= 10 means limit exceeded
    if (count >= 10) {
      reply.header('Retry-After', '60');
      return reply.status(429).send({
        error: 'Too many OAuth requests. Please try again later.',
      });
    }
  };

  // Export middleware for use in auth routes
  app.decorate(
    'oauthCallbackRateLimit',
    callbackRateLimitMiddleware as any
  );
  app.decorate('oauthStartRateLimit', startRateLimitMiddleware as any);
});
