import '@fastify/cookie';
import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
  }
}
