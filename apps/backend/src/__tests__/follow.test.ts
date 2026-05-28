import Fastify, { FastifyInstance } from 'fastify';
import { describe, expect, it, vi, beforeAll, beforeEach, afterAll } from 'vitest';

import { followRoutes } from '../routes/follow.js';

vi.mock('../utils/encryption.js', () => ({
  decrypt: vi.fn(() => 'fake-access-token'),
}));

// ── Shared mock data ──────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-uuid-001';

const MOCK_OAUTH_TOKEN = {
  id: 'token-1',
  userId: MOCK_USER_ID,
  platform: 'unknown',
  accessToken: 'encrypted-token',
};

// ── App factory ───────────────────────────────────────────────────────────────

function buildApp(overrides: {
  oAuthToken?: Record<string, unknown>;
  followLog?: Record<string, unknown>;
} = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  app.decorate('prisma', {
    oAuthToken: {
      findUnique: vi.fn(),
      ...overrides.oAuthToken,
    },
    followLog: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      ...overrides.followLog,
    },
  } as any);

  app.decorate('authenticate', async (request: any) => {
    request.user = { id: MOCK_USER_ID };
  });

  return app;
}

async function makeApp(overrides?: Parameters<typeof buildApp>[0]): Promise<FastifyInstance> {
  const app = buildApp(overrides);
  await app.register(followRoutes, { prefix: '/api/follow' });
  await app.ready();
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/follow/:platform/:targetUsername — API follow', () => {
  it('returns 400 when API follow is not supported for the platform', async () => {
    const findUnique = vi.fn().mockResolvedValue(MOCK_OAUTH_TOKEN);
    const app = await makeApp({ oAuthToken: { findUnique } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/follow/unknown/targetUser',
    });

    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error).toContain('API follow not supported');
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_platform: {
          userId: MOCK_USER_ID,
          platform: 'unknown',
        },
      },
    });

    await app.close();
  });

  it('returns webview strategy and url for webview-strategy platforms (e.g. linkedin)', async () => {
    const app = await makeApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser',
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.strategy).toBe('webview');
    expect(body.url).toContain('linkedin.com/in/testuser');

    await app.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/follow/:platform/:targetUsername/log — follow log validation', () => {
  let app: FastifyInstance;
  let createLog: ReturnType<typeof vi.fn>;

  // One app instance shared across all log tests; mock reset between each test.
  beforeAll(async () => {
    createLog = vi.fn();
    app = await makeApp({ followLog: { create: createLog } });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createLog.mockReset();
    createLog.mockResolvedValue({ id: 'log-uuid-001' });
  });

  // ── Valid payloads ────────────────────────────────────────────────────────

  it('200 — accepts status: success, layer: foreground', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'success', layer: 'foreground' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'success', logId: 'log-uuid-001' });
    expect(createLog).toHaveBeenCalledOnce();
    expect(createLog.mock.calls[0][0].data.status).toBe('success');
  });

  it('200 — accepts status: failed', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'failed', layer: 'foreground' },
    });

    expect(res.statusCode).toBe(200);
    expect(createLog).toHaveBeenCalledOnce();
    expect(createLog.mock.calls[0][0].data.status).toBe('failed');
  });

  it('200 — accepts status: pending, layer: background', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'pending', layer: 'background' },
    });

    expect(res.statusCode).toBe(200);
    expect(createLog).toHaveBeenCalledOnce();
    expect(createLog.mock.calls[0][0].data.layer).toBe('background');
  });

  // ── Invalid status values — analytics integrity ───────────────────────────

  it('400 — rejects invalid status "error" (old unvalidated internal value)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'error', layer: 'foreground' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Invalid follow log payload' });
    // DB must NOT be written — this is the analytics integrity guarantee
    expect(createLog).not.toHaveBeenCalled();
  });

  it('400 — rejects arbitrary status string injection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: '"; DROP TABLE follow_logs; --', layer: 'foreground' },
    });

    expect(res.statusCode).toBe(400);
    expect(createLog).not.toHaveBeenCalled();
  });

  // ── Invalid layer values — analytics integrity ────────────────────────────

  // 'webview' was the old unvalidated default — it is now explicitly rejected.
  // Any existing caller sending layer: 'webview' must migrate to 'foreground'
  // (in-app WebView session) or 'background' (passive deep-link strategy).
  it('400 — rejects legacy layer "webview" (old unvalidated default)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'success', layer: 'webview' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'Invalid follow log payload' });
    expect(createLog).not.toHaveBeenCalled();
  });

  it('400 — rejects invalid layer "api"', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'success', layer: 'api' },
    });

    expect(res.statusCode).toBe(400);
    expect(createLog).not.toHaveBeenCalled();
  });

  // ── Malformed / missing payloads ──────────────────────────────────────────

  it('400 — rejects missing status field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { layer: 'foreground' },
    });

    expect(res.statusCode).toBe(400);
    expect(createLog).not.toHaveBeenCalled();
  });

  it('400 — rejects missing layer field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'success' },
    });

    expect(res.statusCode).toBe(400);
    expect(createLog).not.toHaveBeenCalled();
  });

  it('400 — rejects empty body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(createLog).not.toHaveBeenCalled();
  });

  // ── Correct data persisted to DB ──────────────────────────────────────────

  it('persists exactly the validated platform, targetUsername, status, and layer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/twitter/janedoe/log',
      payload: { status: 'pending', layer: 'background' },
    });

    expect(res.statusCode).toBe(200);
    expect(createLog).toHaveBeenCalledOnce();

    const written = createLog.mock.calls[0][0].data;
    expect(written).toMatchObject({
      followerId: MOCK_USER_ID,
      targetUsername: 'janedoe',
      platform: 'twitter',
      status: 'pending',
      layer: 'background',
    });
  });

  // ── Response does not leak validation internals ───────────────────────────

  it('400 response only exposes { error } — no schema internals or stack traces', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'bad', layer: 'bad' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body).not.toHaveProperty('issues');
    expect(body).not.toHaveProperty('stack');
    expect(Object.keys(body)).toEqual(['error']);
  });

  // ── DB failure after valid payload ────────────────────────────────────────

  it('500 — returns 500 when DB write fails after successful validation', async () => {
    createLog.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/follow/linkedin/testuser/log',
      payload: { status: 'success', layer: 'foreground' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: 'Failed to log follow event' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/follow/:platform/:targetUsername/log — clear follow log', () => {
  it('clears follow log entries for the authenticated user', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const app = await makeApp({ followLog: { deleteMany } });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/follow/linkedin/testuser/log',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'cleared' });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        followerId: MOCK_USER_ID,
        platform: 'linkedin',
        targetUsername: 'testuser',
      },
    });

    await app.close();
  });
});
