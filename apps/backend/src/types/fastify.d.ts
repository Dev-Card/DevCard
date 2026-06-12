import '@fastify/cookie';
import '@fastify/jwt';
import { FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  id: string;
  username: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthenticatedUser;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
  }
}
