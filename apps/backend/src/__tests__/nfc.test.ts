import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';

import Fastify, {
  type FastifyInstance,
} from 'fastify';

import type { PrismaClient } from '@prisma/client';

import { nfcRoutes } from '../routes/nfc';

// ─── Shared mock data ────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-001';
const MOCK_USERNAME = 'johndoe';
const MOCK_CARD_ID = '123e4567-e89b-12d3-a456-426614174000';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  card: {
    findUnique: vi.fn(),
  },
};

// ─── App factory ─────────────────────────────────────────────────────────────

let mockJwtVerify = vi.fn();

async function buildApp(
  envOverrides?: Record<string, string>,
): Promise<FastifyInstance> {
  // Apply env overrides
  if (envOverrides) {
    for (const [key, value] of Object.entries(envOverrides)) {
      process.env[key] = value;
    }
  }

  const app = Fastify({
    logger: false,
  });

  app.decorate(
    'prisma',
    prismaMock as unknown as PrismaClient,
  );

  app.decorateRequest(
    'jwtVerify',
    function () {
      return mockJwtVerify();
    },
  );

  app.decorate(
    'authenticate',
    async function (request: any, reply: any) {
      try {
        const user = await request.jwtVerify();
        request.user = user;
      } catch (_err) {
        return reply.status(401).send({
          error: 'Unauthorized',
        });
      }
    },
  );

  await app.register(nfcRoutes, {
    prefix: '/api/nfc',
  });

  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  return {
    Authorization: 'Bearer mock-token',
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('NFC API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set default env
    process.env.PUBLIC_APP_URL = 'https://devcard.dev';

    mockJwtVerify.mockResolvedValue({
      id: MOCK_USER_ID,
    });

    app = await buildApp();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.PUBLIC_APP_URL;
    await app.close();
  });

  describe('GET /api/nfc/payload', () => {
    it('200 — returns NFC payload with correct URL using PUBLIC_APP_URL', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: MOCK_USERNAME,
      });
      prismaMock.card.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.type).toBe('URI');
      expect(body.payload).toBe(
        'https://devcard.dev/u/johndoe',
      );
    });

    it('200 — returns NFC payload with card-specific query param', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: MOCK_USERNAME,
      });
      prismaMock.card.findUnique.mockResolvedValue({
        userId: MOCK_USER_ID,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/nfc/payload?card=${MOCK_CARD_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.type).toBe('URI');
      expect(body.payload).toBe(
        `https://devcard.dev/u/johndoe?card=${MOCK_CARD_ID}`,
      );
    });

    it('200 — uses correct /u/:username path format', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'test-user',
      });
      prismaMock.card.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.payload).toContain('/u/test-user');
    });

    it('500 — returns error when PUBLIC_APP_URL is not set', async () => {
      await app.close();
      vi.restoreAllMocks();
      delete process.env.PUBLIC_APP_URL;

      mockJwtVerify = vi.fn().mockResolvedValue({
        id: MOCK_USER_ID,
      });

      app = await buildApp({});

      prismaMock.user.findUnique.mockResolvedValue({
        username: MOCK_USERNAME,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({
        error: 'Server configuration error: PUBLIC_APP_URL is not set',
      });
    });

    it('404 — returns error when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({
        error: 'User not found',
      });
    });

    it('404 — returns error when card does not belong to user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: MOCK_USERNAME,
      });
      prismaMock.card.findUnique.mockResolvedValue({
        userId: 'other-user',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/nfc/payload?card=${MOCK_CARD_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({
        error: 'Card not found',
      });
    });

    it('400 — returns error for invalid card UUID query param', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: MOCK_USERNAME,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload?card=not-a-uuid',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        error: 'Invalid query parameters',
      });
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(
        new Error('Unauthorized'),
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Unauthorized',
      });
    });

    it('200 — handles username with special characters via encoding', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'user name+special@chars',
      });
      prismaMock.card.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/nfc/payload',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.payload).toBe(
        'https://devcard.dev/u/user%20name%2Bspecial%40chars',
      );
    });
  });
});
