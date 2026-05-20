import type { PrismaClient } from '@prisma/client';
import { hashIp } from '../../utils/hashIp.js';

export type TrackViewInput = {
  ownerId: string;
  cardId?: string | null;
  viewerId?: string | null;
  ip?: string;
  userAgent?: string;
  source?: string;
};

/** Records a profile or card view via the existing CardView model. */
export async function trackEvent(prisma: PrismaClient, data: TrackViewInput) {
  return prisma.cardView.create({
    data: {
      ownerId: data.ownerId,
      cardId: data.cardId ?? null,
      viewerId: data.viewerId ?? null,
      viewerIp: hashIp(data.ip),
      viewerAgent: data.userAgent ?? null,
      source: data.source ?? 'link',
    },
  });
}
