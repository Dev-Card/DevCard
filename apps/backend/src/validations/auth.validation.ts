import { z } from 'zod';

export const mobileExchangeSchema = z.object({
  code: z
    .string({ message: 'Exchange code is required' })
    .uuid({ message: 'Exchange code must be a valid UUID' }),
});

export const refreshTokenSchema = z.object({
  refresh_token: z
    .string({ message: 'Refresh token must be a string' })
    .min(1, 'Refresh token cannot be empty')
    .optional(),
});
