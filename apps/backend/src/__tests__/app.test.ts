import { describe, it, expect } from 'vitest';

import { buildApp } from '../app';

process.env.NODE_ENV = 'test';
// validateEnv() runs inside buildApp() and exits if these are absent.
// Provide safe test-only fallbacks so CI doesn't need real secrets here.
process.env.JWT_SECRET ??= 'test-jwt-secret-not-for-production-xxxxxxxxxxxxxxxxxxxxxxx';
process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);

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