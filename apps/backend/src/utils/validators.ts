import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  bio: z.string().max(300).nullable().optional(),
  pronouns: z.string().max(50).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional(),
});

export const createLinkSchema = z.object({
  platform: z.string().min(1),
  username: z.string().min(1).max(200),
  url: z.string().url().optional(),
});

export const reorderLinksSchema = z.object({
  links: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(0),
    })
  ),
});

export const createCardSchema = z.object({
  title: z.string().min(1).max(100),
  linkIds: z.array(z.string().uuid()),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  linkIds: z.array(z.string().uuid()).optional(),
});
