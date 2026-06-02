import { createHash } from 'node:crypto';

import type { FastifyRequest } from 'fastify';

/**
 * Extract the raw JWT string from a Fastify request.
 * Precedence: Authorization: Bearer <token> header → `token` cookie.
 * Returns null if neither is present.
 */
export function extractRawJwt(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (auth?.startsWith('Bearer ')) { return auth.slice(7) || null; }
  return request.cookies?.token || null;
}

/**
 * Compute the Redis blocklist key for a raw JWT.
 *
 * Only the signature segment (third JWT segment) is hashed. The signature is
 * unique per token because it is an HMAC over the header + payload, so it
 * identifies the token without storing any claims in Redis. SHA-256 of the
 * signature also means the Redis key leaks nothing if Redis is compromised.
 */
export function blocklistKey(rawJwt: string): string {
  const sig = rawJwt.split('.')[2] ?? rawJwt;
  return `blocklist:${createHash('sha256').update(sig).digest('hex')}`;
}
