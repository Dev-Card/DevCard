import { CardVisibility } from '@prisma/client';
import {z} from 'zod'

export const createCardSchema = z.object({
  title: z.string().min(1).max(100),

  linkIds: z
    .array(z.string().uuid())
    .nonempty({
      message: 'At least one link is required',
    })
    .refine(
      (ids) => new Set(ids).size === ids.length,
      {
        message: 'Duplicate links are not allowed',
      }
    ),
  description: z.string().min(1).max(100).optional(),
  visibility: z.nativeEnum(CardVisibility).optional(),
});

export const updateCardSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(100).optional(),
    visibility: z.nativeEnum(CardVisibility).optional(),
    qrEnabled: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.visibility !== undefined ||
      data.qrEnabled !== undefined,
    {
      message: 'At least one field must be provided',
    }
);

export const addPlatformLinkSchema = z.object({
  platformLinkId: z.string().uuid({
    message: 'Invalid platform link ID',
  }),
});