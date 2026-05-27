import type { FastifyRequest } from 'fastify';

/**
 * Extracts the authenticated user ID from the Bearer JWT when present.
 * Returns null for unauthenticated requests or invalid/expired tokens.
 * Never throws — safe to call on any request regardless of auth state.
 */
export async function getRequestUserId(request: FastifyRequest): Promise<string | null> {
  if (!request.headers.authorization) {
    return null;
  }
  try {
    const decoded = (await request.jwtVerify()) as { id: string };
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}
