import { describe, it, expect, vi } from 'vitest';

import { buildApp } from '../app';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.ENCRYPTION_KEY ||= 'test-encryption-key';

describe('GET /health', () => {
  it('should return status ok', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });

    await app.close();
  });
});

describe('request logging hook', () => {
  it('logs method and url for each request', async () => {
    const app = await buildApp();
    const spy = vi.spyOn(app.log, 'info');

    await app.inject({ method: 'GET', url: '/health' });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/health' }),
      'incoming request',
    );

    await app.close();
  });
});