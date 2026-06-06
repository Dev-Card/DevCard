import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, {type FastifyInstance} from 'fastify';

import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { cardRoutes } from './routes/cards.js';
import { connectRoutes } from './routes/connect.js';
import { eventRoutes } from './routes/event.js';
import { followRoutes } from './routes/follow.js';
import { nfcRoutes } from './routes/nfc.js';
import { profileRoutes } from './routes/profiles.js';
import { publicRoutes } from './routes/public.js';
import { validateEnv } from './utils/validateEnv.js';
import { teamRoutes } from './routes/team.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp():Promise<FastifyInstance> {
  // Validate all required secrets before registering any plugin.
  // If validation fails the process exits here — no partially-initialised
  // auth state can exist because Fastify is not yet instantiated.
  validateEnv();

  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Core Plugins ───
  await app.register(cors, {
    origin: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:', 'https://fonts.gstatic.com'],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'", 'https://fonts.googleapis.com'],
        upgradeInsecureRequests: [],
      },
    },
  });

  await app.register(jwt, {
    // validateEnv() above guarantees JWT_SECRET is present and safe.
    secret: process.env.JWT_SECRET!,
  });

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

// Files must be served through authenticated route handlers
// with ownership validation.

  // ─── Database & Cache Plugins ───
 if (process.env.NODE_ENV !== 'test') {
  await app.register(prismaPlugin); //change 
}
  if (process.env.NODE_ENV !== 'test') {
  await app.register(redisPlugin);
}
  // ─── Auth Decorator ───
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      // Ensure the verified payload is assigned to `request.user` like the original plugin.
      const payload = await request.jwtVerify();
      if (payload) request.user = payload;
    } catch (error) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // ─── Routes ───
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.register(cardRoutes, { prefix: '/api/cards' });
  // Public routes: standardise on `/api/u` (remove duplicate `/api/public`).
  await app.register(publicRoutes, { prefix: '/api/u' });
  await app.register(followRoutes, { prefix: '/api/follow' });
  await app.register(connectRoutes, { prefix: '/api/connect' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(nfcRoutes, { prefix: '/api/nfc' });
  await app.register(eventRoutes, {prefix: '/api/events'})
  await app.register(teamRoutes, {prefix: '/api/teams'})


  // ─── Health Check ───
type HealthResponse = {
  status: 'ok';
};

app.get('/health', async (): Promise<HealthResponse> => {
  return { status: 'ok' };
});

  // Centralized error handler: log and return a consistent 500 shape for unhandled errors.
  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error }, 'Unhandled error');
    // Also print to console to aid test diagnostics when logger is disabled.
    // This helps surface stack traces in CI/test runs.
    // eslint-disable-next-line no-console
    console.error(error);
    // If headers were already sent, fall back to default behaviour.
    if (reply.sent) {
      return;
    }
    // Keep response shape consistent across the API.
    reply.status(500).send({ error: 'Internal server error' });
  });
  return app;
}
