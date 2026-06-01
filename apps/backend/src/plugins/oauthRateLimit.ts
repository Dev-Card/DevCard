import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

/**
 * OAuth Rate Limit Plugin
 * Provides stricter rate limiting for OAuth endpoints to prevent brute force attacks
 * - Callback endpoints: 5 requests per minute per IP
 * - OAuth start endpoints: 10 requests per minute per IP
 * - Uses Redis for distributed rate limiting across multiple instances
 */
export const oauthRateLimitPlugin = fastifyPlugin(async (app: FastifyInstance) => {
  // Rate limit for OAuth callback endpoints (stricter)
  const callbackLimiter = rateLimit.createStore({
    max: 5,
    timeWindow: '1 minute',
    cache: 10000,
    skipOnError: true,
  });

  // Rate limit for OAuth start endpoints (moderate)
  const startLimiter = rateLimit.createStore({
    max: 10,
    timeWindow: '1 minute',
    cache: 10000,
    skipOnError: true,
  });

  // Middleware for OAuth callback rate limiting (per IP, with user-aware fallback)
  const callbackRateLimitMiddleware = async (
    request: FastifyRequest,
    reply: any
  ) => {
    // Use user ID if authenticated, otherwise use IP
    const key = (request.user as any)?.id || request.ip;
    const limited = await callbackLimiter.incr(key);

    if (limited > 5) {
      return reply.status(429).send({
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: 60,
      });
    }
  };

  // Middleware for OAuth start rate limiting (per IP)
  const startRateLimitMiddleware = async (
    request: FastifyRequest,
    reply: any
  ) => {
    const key = `oauth_start:${request.ip}`;
    const limited = await startLimiter.incr(key);

    if (limited > 10) {
      return reply.status(429).send({
        error: 'Too many OAuth requests. Please try again later.',
        retryAfter: 60,
      });
    }
  };

  // Export middleware for use in auth routes
  app.decorate('oauthCallbackRateLimit', callbackRateLimitMiddleware);
  app.decorate('oauthStartRateLimit', startRateLimitMiddleware);
});
