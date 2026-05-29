process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-mock-which-is-at-least-thirty-two-chars-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-mock-32-char-min';

import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';

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