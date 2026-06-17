import { z } from 'zod';

export const oAuthStartSchema = z.object({
  state: z.string().optional().default(''),
  mobile_redirect_uri: z
    .string()
    .optional()
    .default('')
    .refine(
      (val) => !val || val.startsWith('devcard://'),
      { message: 'Invalid mobile redirect URI' }
    ),
});

export type OAuthStartQuery = z.infer<typeof oAuthStartSchema>;