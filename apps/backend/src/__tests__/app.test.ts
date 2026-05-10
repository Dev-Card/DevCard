import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildApp } from '../app.js';

describe('request logging middleware', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('logs method and path (without query string) for each request', async () => {
    app = await buildApp();
    const logSpy = vi.spyOn(app.log, 'info');

    await app.inject({ method: 'GET', url: '/health?foo=bar' });

    const calls = logSpy.mock.calls.map((c) => c[0]);
    const loggedRequest = calls.find(
      (c: any) => typeof c === 'object' && c?.method === 'GET' && c?.url === '/health'
    );
    expect(loggedRequest).toBeDefined();
  });

  it('does not log query string parameters', async () => {
    app = await buildApp();
    const logSpy = vi.spyOn(app.log, 'info');

    await app.inject({ method: 'GET', url: '/health?secret=token123' });

    const calls = logSpy.mock.calls.map((c) => c[0]);
    const leaked = calls.find(
      (c: any) => typeof c === 'object' && typeof c?.url === 'string' && c.url.includes('secret')
    );
    expect(leaked).toBeUndefined();
  });

  it('returns 200 for health check (existing behavior unchanged)', async () => {
    app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });
});
