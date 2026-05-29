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

import { analyticsRoutes } from '../routes/analytics';

// ─── Shared mock data ────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-001';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const prismaMock = {
  cardView: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  followLog: {
    count: vi.fn(),
  },
};

// ─── App factory ─────────────────────────────────────────────────────────────

let mockJwtVerify = vi.fn();

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  app.decorate(
    'prisma',
    prismaMock as unknown as PrismaClient
  );

  app.decorateRequest(
    'jwtVerify',
    function () {
      return mockJwtVerify();
    }
  );

  app.decorate(
    'authenticate',
    async function (
      request: any,
      reply: any
    ) {
      try {
        const user =
          await request.jwtVerify();

        request.user = user;
      } catch (_err) {
        return reply.status(401).send({
          error: 'Unauthorized',
        });
      }
    }
  );

  await app.register(
    analyticsRoutes,
    {
      prefix: '/api/analytics',
    }
  );

  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  return {
    Authorization:
      'Bearer mock-token',
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe(
  'Analytics API',
  () => {
    let app: FastifyInstance;

    beforeEach(
      async () => {
        vi.clearAllMocks();

        mockJwtVerify.mockResolvedValue(
          {
            id: MOCK_USER_ID,
          }
        );

        app = await buildApp();
      }
    );

    afterEach(
      async () => {
        await app.close();
      }
    );

    // ── GET /overview ───────────────────────────────────────────────────────

    describe(
      'GET /api/analytics/overview',
      () => {
        it(
          '200 — returns analytics overview',
          async () => {
            prismaMock.cardView.count
              .mockResolvedValueOnce(
                100
              )
              .mockResolvedValueOnce(
                10
              );

            prismaMock.followLog.count.mockResolvedValue(
              5
            );

            prismaMock.cardView.findMany.mockResolvedValue(
              [
                {
                  id: 'view-1',
                  viewer: {
                    displayName:
                      'John',
                    avatarUrl:
                      null,
                  },
                  card: {
                    title:
                      'My Card',
                  },
                },
              ]
            );

            prismaMock.cardView.groupBy.mockResolvedValue(
              [
                {
                  viewerId:
                    'u1',
                  viewerIp:
                    null,
                },
                {
                  viewerId:
                    'u2',
                  viewerIp:
                    null,
                },
              ]
            );

            const res =
              await app.inject(
                {
                  method:
                    'GET',
                  url:
                    '/api/analytics/overview',
                  headers:
                    authHeader(),
                }
              );

            expect(
              res.statusCode
            ).toBe(200);

            const body =
              res.json();

            expect(
              body.totalViews
            ).toBe(100);

            expect(
              body.viewsToday
            ).toBe(10);

            expect(
              body.totalFollows
            ).toBe(5);

            expect(
              body.uniqueViewers
            ).toBe(2);

            expect(
              body.recentViews
            ).toHaveLength(
              1
            );
          }
        );

        it(
          '401 — rejects unauthenticated request',
          async () => {
            mockJwtVerify.mockRejectedValue(
              new Error(
                'Unauthorized'
              )
            );

            const res =
              await app.inject(
                {
                  method:
                    'GET',
                  url:
                    '/api/analytics/overview',
                }
              );

            expect(
              res.statusCode
            ).toBe(401);

            expect(
              res.json()
            ).toMatchObject(
              {
                error:
                  'Unauthorized',
              }
            );
          }
        );
      }
    );

    // ── GET /views ──────────────────────────────────────────────────────────

    describe(
      'GET /api/analytics/views',
      () => {
        it(
          '200 — returns paginated views',
          async () => {
            prismaMock.cardView.count.mockResolvedValue(
              45
            );

            prismaMock.cardView.findMany.mockResolvedValue(
              [
                {
                  id:
                    'view-1',
                  viewer:
                    {
                      id:
                        'viewer-1',
                      username:
                        'john',
                      displayName:
                        'John',
                      avatarUrl:
                        null,
                    },
                  card:
                    {
                      id:
                        'card-1',
                      title:
                        'Portfolio',
                    },
                },
              ]
            );

            const res =
              await app.inject(
                {
                  method:
                    'GET',
                  url:
                    '/api/analytics/views?page=2',
                  headers:
                    authHeader(),
                }
              );

            expect(
              res.statusCode
            ).toBe(200);

            const body =
              res.json();

            expect(
              body.data
            ).toHaveLength(
              1
            );

            expect(
              body.meta
            ).toMatchObject(
              {
                total:
                  45,
                page: 2,
                limit:
                  20,
                totalPages:
                  3,
              }
            );

            expect(
              prismaMock.cardView.findMany.mock.calls[0][0]
            ).toMatchObject(
              {
                skip:
                  20,
                take:
                  20,
              }
            );
          }
        );

        it(
          '200 — filters by cardId when provided',
          async () => {
            prismaMock.cardView.count.mockResolvedValue(
              0
            );

            prismaMock.cardView.findMany.mockResolvedValue(
              []
            );

            const res =
              await app.inject(
                {
                  method:
                    'GET',
                  url:
                    '/api/analytics/views?cardId=card-123',
                  headers:
                    authHeader(),
                }
              );

            expect(
              res.statusCode
            ).toBe(200);

            expect(
              prismaMock.cardView.count.mock.calls[0][0]
            ).toMatchObject(
              {
                where:
                  {
                    ownerId:
                      MOCK_USER_ID,
                    cardId:
                      'card-123',
                  },
              }
            );
          }
        );

        it(
          '200 — defaults to page 1',
          async () => {
            prismaMock.cardView.count.mockResolvedValue(
              0
            );

            prismaMock.cardView.findMany.mockResolvedValue(
              []
            );

            const res =
              await app.inject(
                {
                  method:
                    'GET',
                  url:
                    '/api/analytics/views',
                  headers:
                    authHeader(),
                }
              );

            expect(
              res.statusCode
            ).toBe(200);

            expect(
              prismaMock.cardView.findMany.mock.calls[0][0]
            ).toMatchObject(
              {
                skip:
                  0,
                take:
                  20,
              }
            );
          }
        );

        it(
          '401 — rejects unauthenticated request',
          async () => {
            mockJwtVerify.mockRejectedValue(
              new Error(
                'Unauthorized'
              )
            );

            const res =
              await app.inject(
                {
                  method:
                    'GET',
                  url:
                    '/api/analytics/views',
                }
              );

            expect(
              res.statusCode
            ).toBe(401);

            expect(
              res.json()
            ).toMatchObject(
              {
                error:
                  'Unauthorized',
              }
            );
          }
        );
      }
    );
  }
);