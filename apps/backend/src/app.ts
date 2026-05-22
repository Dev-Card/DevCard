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
import { connectRoutes } from './routes/connect.js';
import { analyticsRoutes } from './routes/analytics.js';
import { eventRoutes } from './routes/event.js';


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
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ];
  if (process.env.PUBLIC_APP_URL) {
    allowedOrigins.push(process.env.PUBLIC_APP_URL);
  }

  await app.register(cors, {
    origin: allowedOrigins,
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
  await app.register(connectRoutes, { prefix: '/api/connect' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(eventRoutes, {prefix: '/api/events'})

  // ─── Health Check ───
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'devcard-api',
  }));

  return app;
}
