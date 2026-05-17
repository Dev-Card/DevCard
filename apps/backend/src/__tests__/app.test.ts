import { describe, it, expect, vi } from 'vitest';
import { buildApp } from '../app.js';

describe('Request logging middleware', () => {
  it('logs method and url for each incoming request', async () => {
    const app = await buildApp();
    const logSpy = vi.spyOn(app.log, 'info');

    await app.inject({ method: 'GET', url: '/health' });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/health',
      }),
      'incoming request',
    );

    await app.close();
  });

  it('logs POST requests with correct method', async () => {
    const app = await buildApp();
    const logSpy = vi.spyOn(app.log, 'info');

    await app.inject({ method: 'POST', url: '/api/u/testuser' });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/u/testuser',
      }),
      'incoming request',
    );

    await app.close();
  });
});
