import { Prisma } from '@prisma/client';

import type { FastifyReply, FastifyRequest } from 'fastify';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface GoogleTokenErrorResponse {
  error: string;
  error_description?: string;
}

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubTokenErrorResponse {
  error: string;
  error_description?: string;
}



export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function handleDbError(error: unknown, request: FastifyRequest, reply: FastifyReply): FastifyReply {
  request.log.error(error);
  
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const dbErr = error as Prisma.PrismaClientKnownRequestError;
    // P2002: Unique constraint failed
    if (dbErr.code === 'P2002') {
      return reply.status(409).send({ error: 'Conflict: Record already exists or violates unique constraint' });
    }
    // P2025: Record to update not found
    if (dbErr.code === 'P2025') {
      return reply.status(404).send({ error: 'Not Found: Record does not exist' });
    }
    // P2003: Foreign key constraint failed
    if (dbErr.code === 'P2003') {
      return reply.status(400).send({ error: 'Constraint failed: Related record not found or invalid' });
    }
    return reply.status(400).send({ error: `Database error: ${dbErr.message}` });
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.status(400).send({ error: 'Database validation failed' });
  }
  
  return reply.status(500).send({ error: 'Internal Server Error' });
}

export function isGoogleTokenError(
  data: GoogleTokenResponse | GoogleTokenErrorResponse,
): data is GoogleTokenErrorResponse {
  return 'error' in data;
}

export function isGitHubTokenError(
  data: GitHubTokenResponse | GitHubTokenErrorResponse,
): data is GitHubTokenErrorResponse {
  return 'error' in data;
}