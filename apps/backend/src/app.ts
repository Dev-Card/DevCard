import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { cardRoutes } from './routes/cards.js';
import { publicRoutes } from './routes/public.js';
import { followRoutes } from './routes/follow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
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

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  });

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

  // Static file serving for uploads
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ─── Database & Cache Plugins ───
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

  // ─── Auth Decorator ───
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // ─── Routes ───
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(profileRoutes, { prefix: '/api/profiles' });
  await app.register(cardRoutes, { prefix: '/api/cards' });
  await app.register(publicRoutes, { prefix: '/api/u' });
  await app.register(followRoutes, { prefix: '/api/follow' });

  // ─── Health Check ───
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'devcard-api',
  }));

  return app;
}
