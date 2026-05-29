process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing';
process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-exactly-32-chars!!';
process.env.PUBLIC_APP_URL = 'http://localhost:5173';

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