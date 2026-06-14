import { describe, it, expect } from 'vitest';
import { mobileExchangeSchema, refreshTokenSchema } from '../validations/auth.validation.js';

describe('auth.validation', () => {
  describe('mobileExchangeSchema', () => {
    it('accepts a valid UUID code', () => {
      const result = mobileExchangeSchema.safeParse({
        code: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('rejects a non-UUID string', () => {
      const result = mobileExchangeSchema.safeParse({
        code: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.code).toBeDefined();
      }
    });

    it('rejects missing code', () => {
      const result = mobileExchangeSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('accepts a valid refresh_token string', () => {
      const result = refreshTokenSchema.safeParse({
        refresh_token: 'some-refresh-token',
      });
      expect(result.success).toBe(true);
    });

    it('accepts an empty body (refresh_token is optional)', () => {
      const result = refreshTokenSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.refresh_token).toBeUndefined();
      }
    });

    it('rejects a non-string refresh_token', () => {
      const result = refreshTokenSchema.safeParse({
        refresh_token: 123,
      });
      expect(result.success).toBe(false);
    });
  });
});
