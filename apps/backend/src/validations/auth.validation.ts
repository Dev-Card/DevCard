import { z } from 'zod';

export const mobileExchangeSchema = z.object({
  code: z.string({
    required_error: 'missing code',
    invalid_type_error: 'code must be a string'
  }).trim().min(1, 'code is empty')
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string({
    required_error: 'missing refresh_token',
    invalid_type_error: 'refresh_token must be a string'
  }).trim().min(1, 'refresh_token is empty')
});
