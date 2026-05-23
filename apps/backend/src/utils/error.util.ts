import { Prisma } from '@prisma/client';

import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Log a non-fatal background task failure without dumping raw error objects. */
export function logBackgroundError(
  log: FastifyBaseLogger,
  err: unknown,
  message: string,
  context?: Record<string, unknown>,
) {
  log.error({ ...context, err: getErrorMessage(err) }, message);
}

/** Safe fields for OAuth provider error responses (never log tokens). */
export function getOAuthProviderErrorFields(tokenData: {
  error?: string;
  error_description?: string;
}) {
  return {
    error: tokenData.error,
    ...(tokenData.error_description
      ? { errorDescription: tokenData.error_description }
      : {}),
  };
}

export function handleDbError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);
  
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'Conflict: Record already exists or violates unique constraint' });
    }
    // P2025: Record to update not found
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Not Found: Record does not exist' });
    }
    // P2003: Foreign key constraint failed
    if (error.code === 'P2003') {
      return reply.status(400).send({ error: 'Constraint failed: Related record not found or invalid' });
    }
    return reply.status(400).send({ error: `Database error: ${error.message}` });
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.status(400).send({ error: 'Database validation failed' });
  }
  
  return reply.status(500).send({ error: 'Internal Server Error' });
}