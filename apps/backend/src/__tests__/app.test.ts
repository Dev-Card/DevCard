import { describe, it, expect, vi } from 'vitest';
import { buildApp } from '../app.js';

describe('request logging middleware', () => {
  it('logs method and url for each incoming request', async () => {
    const app = await buildApp();
    const logSpy = vi.spyOn(app.log, 'info');

    await app.inject({ method: 'GET', url: '/health' });

    const calls = logSpy.mock.calls.map((c) => c[0]);
    const loggedRequest = calls.find(
      (c: any) => typeof c === 'object' && c?.method === 'GET' && c?.url === '/health'
    );
    expect(loggedRequest).toBeDefined();
  });

  it('returns 200 for health check (existing behavior unchanged)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });
});
