import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { nfcRoutes } from '../routes/nfc.js';

const TEST_APP_URL = 'https://test.devcard.dev';

beforeAll(() => { process.env.PUBLIC_APP_URL = TEST_APP_URL; });
afterAll(() => { delete process.env.PUBLIC_APP_URL; });

function buildApp(prismaOverrides: Record<string, any> = {}, authenticateReject = false) {
  const app = Fastify();

  (app as any).prisma = {
    user: {
      findUnique: prismaOverrides.findUser ?? vi.fn(async () => ({ username: 'testuser' })),
    },
    card: {
      findFirst: prismaOverrides.findCard ?? vi.fn(async () => ({ id: 'card-1' })),
    },
  };

  (app as any).authenticate = async (request: any, reply: any) => {
    if (authenticateReject) return reply.status(401).send({ error: 'Unauthorized' });
    request.user = { id: 'user-1' };
  };

  app.register(nfcRoutes, { prefix: '/api/nfc' });
  return app;
}

describe('GET /api/nfc/payload', () => {
  it('returns 401 when unauthenticated', async () => {
    const app = buildApp({}, true);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/nfc/payload' });
    expect(res.statusCode).toBe(401);
  });

  it('returns full profile URI payload when no cardId given', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/nfc/payload' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.type).toBe('URI');
    expect(body.payload).toBe(`${TEST_APP_URL}/u/testuser`);
  });

  it('does not call user lookup when cardId is provided', async () => {
    const findUser = vi.fn(async () => ({ username: 'testuser' }));
    const app = buildApp({ findUser });
    await app.ready();
    await app.inject({ method: 'GET', url: '/api/nfc/payload?card=card-1' });
    expect(findUser).not.toHaveBeenCalled();
  });

  it('returns full card URI payload when cardId is provided and owned', async () => {
    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/nfc/payload?card=card-1' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.type).toBe('URI');
    expect(body.payload).toBe(`${TEST_APP_URL}/devcard/card-1`);
  });

  it('returns 403 when cardId does not belong to the user', async () => {
    const app = buildApp({ findCard: vi.fn(async () => null) });
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/nfc/payload?card=other-card' });
    expect(res.statusCode).toBe(403);
  });
});
