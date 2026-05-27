/**
 * @file plugins/rate-limit.ts
 *
 * Redis-backed, tiered rate limiter for DevCard.
 *
 * Tiers
 * ──────────────────────────────────────────────────────────────────────────
 * STRICT   – auth & OAuth callback routes  →  10 req / 1 min  (per IP)
 * MODERATE – profile/card mutation routes  →  30 req / 1 min  (per user ID when authed, else per IP)
 * RELAXED  – public read routes            → 100 req / 1 min  (per IP)
 *
 * Per-user keying on authenticated routes prevents innocent users behind
 * shared NAT/proxy IPs from being blocked by a single bad actor.
 *
 * All 429 responses include:
 *   • Retry-After header (seconds)
 *   • X-RateLimit-Limit / X-RateLimit-Remaining / X-RateLimit-Reset headers
 *   • JSON body matching the project's existing { error, retryAfter } shape
 */

import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';

// ─── Tier configuration ──────────────────────────────────────────────────────

export const RATE_LIMIT_TIERS = {
  /** Auth & OAuth callback flows — brute-force hardened */
  STRICT: {
    max: 10,
    timeWindow: 60_000, // 1 minute in ms
  },
  /** Profile / card mutation routes */
  MODERATE: {
    max: 30,
    timeWindow: 60_000,
  },
  /** Public read endpoints */
  RELAXED: {
    max: 100,
    timeWindow: 60_000,
  },
} as const;

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  /**
   * Register @fastify/rate-limit globally.
   * We use the already-initialised Redis instance from redisPlugin so the
   * rate-limit state survives server restarts and is shared across processes.
   *
   * Individual routes can override the global defaults via route-level config:
   *
   *   config: { rateLimit: { max: 10, timeWindow: 60_000 } }
   *
   * …or opt-out entirely:
   *
   *   config: { rateLimit: false }
   */
  await app.register(rateLimit, {
    // ── Backing store ────────────────────────────────────────────────────────
    redis: app.redis,

    // ── Global defaults (RELAXED tier — lowest-risk baseline) ───────────────
    max: RATE_LIMIT_TIERS.RELAXED.max,
    timeWindow: RATE_LIMIT_TIERS.RELAXED.timeWindow,

    // ── Key generation ───────────────────────────────────────────────────────
    //
    // For unauthenticated requests we key by IP (the default).
    // For authenticated requests we key by user ID so that legitimate users
    // sharing a corporate proxy or VPN are not throttled by a different user's
    // abuse pattern.
    keyGenerator(request: FastifyRequest): string {
      let userId: string | null = null;

      // Soft-decode the JWT without throwing — the route's own preHandler will
      // reject the request properly if the token is actually invalid.
      try {
        const payload = request.user as { id?: string } | undefined;
        if (payload?.id) {
          userId = payload.id;
        }
      } catch {
        // Not authenticated — fall through to IP keying
      }

      const routeKey = request.routeOptions?.url ?? request.url;

      if (userId) {
        return `rl:user:${userId}:${routeKey}`;
      }

      // Respect X-Forwarded-For when behind a trusted reverse proxy
      const forwarded = request.headers['x-forwarded-for'];
      const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : (forwarded?.split(',')[0].trim() ?? request.ip);

      return `rl:ip:${ip}:${routeKey}`;
    },

    // ── 429 response shape ───────────────────────────────────────────────────
    //
    // Matches the project's existing { error: string } envelope and adds
    // retryAfter so clients can schedule back-off without parsing headers.
    errorResponseBuilder(request, context) {
      const retryAfterSeconds = Math.ceil(context.ttl / 1000);

      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. You may retry after ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
        retryAfter: retryAfterSeconds,
      };
    },

    // ── Standard rate-limit response headers ─────────────────────────────────
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },

    // ── Skip rate-limiting for the health-check endpoint ────────────────────
    skip(request: FastifyRequest) {
      return request.url === '/health';
    },
  });

  app.log.info('🛡️  Rate limiter registered (Redis-backed, tiered)');
});

// ─── Route-level config helpers ──────────────────────────────────────────────
//
// Use these as the `config.rateLimit` value on individual route definitions
// to apply a specific tier without repeating magic numbers everywhere.
//
// Example usage inside a route file:
//
//   app.post('/login', {
//     config: { rateLimit: STRICT_RATE_LIMIT },
//   }, handler);

export const STRICT_RATE_LIMIT = {
  max: RATE_LIMIT_TIERS.STRICT.max,
  timeWindow: RATE_LIMIT_TIERS.STRICT.timeWindow,
} as const;

export const MODERATE_RATE_LIMIT = {
  max: RATE_LIMIT_TIERS.MODERATE.max,
  timeWindow: RATE_LIMIT_TIERS.MODERATE.timeWindow,
} as const;

export const RELAXED_RATE_LIMIT = {
  max: RATE_LIMIT_TIERS.RELAXED.max,
  timeWindow: RATE_LIMIT_TIERS.RELAXED.timeWindow,
} as const;
