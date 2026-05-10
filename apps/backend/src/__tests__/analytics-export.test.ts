import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { analyticsRoutes } from '../routes/analytics.js';

// Minimal mock of app.prisma and app.authenticate
function buildApp(prismaOverrides: Record<string, any> = {}, authenticateReject = false) {
  const app = Fastify();

  const defaultCardViewGroupBy = vi.fn(async () => []);
  const defaultFollowGroupBy = vi.fn(async () => []);

  (app as any).prisma = {
    cardView: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      groupBy: prismaOverrides.cardViewGroupBy ?? defaultCardViewGroupBy,
    },
    followLog: {
      count: vi.fn(async () => 0),
      groupBy: prismaOverrides.followGroupBy ?? defaultFollowGroupBy,
    },
  };

  (app as any).authenticate = async (request: any, reply: any) => {
    if (authenticateReject) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    request.user = { id: 'user-1' };
  };

  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  return app;
}

describe('GET /api/analytics/export', () => {
  it('returns 401 when unauthenticated', async () => {
    const app = buildApp({}, true);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/analytics/export' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when querying another user data via userId param', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/export?userId=other-user',
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns CSV with correct headers and structure', async () => {
    const date = new Date('2025-01-15T10:00:00Z');
    const app = buildApp({
      cardViewGroupBy: vi.fn(async () => [
        { createdAt: date, source: 'qr', _count: { id: 3 } },
        { createdAt: date, source: 'web', _count: { id: 2 } },
      ]),
      followGroupBy: vi.fn(async () => [
        { createdAt: date, platform: 'github', _count: { id: 1 } },
      ]),
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/api/analytics/export' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('devcard-analytics.csv');

    const lines = res.body.split('\n');
    expect(lines[0]).toBe('date,platform,event_type,count');
    // Check all data rows exist
    const dataLines = lines.slice(1);
    expect(dataLines).toContain('2025-01-15,qr,card_view,3');
    expect(dataLines).toContain('2025-01-15,web,card_view,2');
    expect(dataLines).toContain('2025-01-15,github,follow,1');
  });

  it('returns only header row when user has no data', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/analytics/export' });
    expect(res.statusCode).toBe(200);
    expect(res.body.trim()).toBe('date,platform,event_type,count');
  });
});
