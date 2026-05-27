/**
 * plugins/rate-limit.ts
 *
 * Redis-backed, tiered rate limiter for DevCard.
 *
 * Tiers
 * ─────────────────────────────────────────────────────────────────────────────
 * STRICT   – auth / OAuth callbacks           10 req / 15 min  (per IP)
 * MODERATE – profile/card mutations           60 req / 1 min   (per user ID when authed, else IP)
 * RELAXED  – public read, analytics reads    120 req / 1 min   (per IP)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * All 429 responses include:
 *   - Retry-After header (seconds until window resets)
 *   - X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
 *   - JSON body matching the project's existing error shape: { error, statusCode, retryAfter }
 *
 * Per-user keying
 * ─────────────────────────────────────────────────────────────────────────────
 * Authenticated routes key on `user:<userId>` so users behind shared IPs or
 * NAT gateways are never incorrectly throttled by other users' traffic.
 * Unauthenticated routes fall back to `ip:<remoteAddress>`.
 */

import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';

// ─── Tier definitions ────────────────────────────────────────────────────────

export const TIERS = {
  /** OAuth initiation + callbacks, dev-login — brute-force / credential-stuffing surface */
  STRICT: {
    max: 10,
    timeWindow: 15 * 60 * 1000, // 15 minutes in ms
    ban: 0,                      // no ban; just 429
  },

  /** Profile mutations, card CRUD, platform link writes, follow actions, NFC writes */
  MODERATE: {
    max: 60,
    timeWindow: 60 * 1000, // 1 minute
    ban: 0,
  },

  /** Public profile reads, card views, QR generation, analytics reads */
  RELAXED: {
    max: 120,
    timeWindow: 60 * 1000, // 1 minute
    ban: 0,
  },
} as const;

// ─── Key generators ──────────────────────────────────────────────────────────

/**
 * Returns a per-IP key. Used for unauthenticated / public routes.
 */
export function ipKeyGenerator(request: FastifyRequest): string {
  const ip = request.ip ?? 'unknown';
  return `rl:ip:${ip}`;
}

/**
 * Returns a per-user-ID key when a valid JWT is present, otherwise falls back
 * to IP. This means authenticated users behind shared NAT are isolated.
 */
export function userOrIpKeyGenerator(request: FastifyRequest): string {
  try {
    // jwtDecode does NOT verify signature — we only need the payload for keying.
    // Signature verification still happens in the authenticate preHandler.
    const payload = (request as any).user as { id?: string } | undefined;
    if (payload?.id) {
      return `rl:user:${payload.id}`;
    }
  } catch {
    // fall through
  }
  return ipKeyGenerator(request);
}

// ─── Error response shape ────────────────────────────────────────────────────

/**
 * Matches the project's existing error envelope so clients see a consistent shape.
 *
 * {
 *   error:       "Too Many Requests",
 *   statusCode:  429,
 *   retryAfter:  42,       // seconds until the counter resets
 *   message:     "…"
 * }
 */
function buildErrorResponse(timeToReset: number) {
  const retryAfterSecs = Math.ceil(timeToReset / 1000);
  return {
    error: 'Too Many Requests',
    statusCode: 429,
    retryAfter: retryAfterSecs,
    message: `Rate limit exceeded. Retry after ${retryAfterSecs} seconds.`,
  };
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export const rateLimitPlugin = fp(
  async (app: FastifyInstance) => {
    // The redis instance is already attached by redisPlugin (fp-wrapped, so
    // it is visible in child scopes). We pass the same ioredis client to
    // @fastify/rate-limit so state survives server restarts.
    await app.register(rateLimit, {
      global: false, // we apply limits per-route, not globally
      redis: app.redis,
      // Provide a sensible global default as a safety net for any routes that
      // don't explicitly configure a tier. This will never fire in practice
      // because every route group opts in to a specific tier.
      max: TIERS.RELAXED.max,
      timeWindow: TIERS.RELAXED.timeWindow,
      keyGenerator: ipKeyGenerator,
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
      errorResponseBuilder(request, context) {
        return buildErrorResponse(context.ttl);
      },
    });

    app.log.info('🛡️  Rate limiting enabled (Redis-backed, tiered)');
  },
  {
    // Declare that this plugin depends on redisPlugin being registered first.
    dependencies: ['redis-plugin'],
    name: 'rate-limit-plugin',
  }
);

// ─── Per-route config helpers ────────────────────────────────────────────────
// Import these in route files to apply the correct tier cleanly.

/** Strict: auth / OAuth routes — per-IP */
export const strictRateLimit = {
  config: {
    rateLimit: {
      ...TIERS.STRICT,
      keyGenerator: ipKeyGenerator,
      errorResponseBuilder(_req: FastifyRequest, context: { ttl: number }) {
        return buildErrorResponse(context.ttl);
      },
    },
  },
};

/** Moderate: mutation routes — per-user-ID (falls back to IP when unauthed) */
export const moderateRateLimit = {
  config: {
    rateLimit: {
      ...TIERS.MODERATE,
      keyGenerator: userOrIpKeyGenerator,
      errorResponseBuilder(_req: FastifyRequest, context: { ttl: number }) {
        return buildErrorResponse(context.ttl);
      },
    },
  },
};

/** Relaxed: public read routes — per-IP */
export const relaxedRateLimit = {
  config: {
    rateLimit: {
      ...TIERS.RELAXED,
      keyGenerator: ipKeyGenerator,
      errorResponseBuilder(_req: FastifyRequest, context: { ttl: number }) {
        return buildErrorResponse(context.ttl);
      },
    },
  },
};
