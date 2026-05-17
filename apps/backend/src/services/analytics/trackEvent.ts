import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';

type TrackEventInput = {
    userId: string;

    viewerId?: string;
    cardId?: string;

    eventType:
    | 'PROFILE_VIEW'
    | 'CARD_VIEW'
    | 'LINK_CLICK'
    | 'FOLLOW_ATTEMPT'
    | 'FOLLOW_SUCCESS'
    | 'QR_SCAN'
    | 'SHARE_ACTION'
    | 'COPY_LINK';

    platform?: string;
    source?: string;

    ip?: string;
    userAgent?: string;

    metadata?: Prisma.InputJsonValue;
};

export async function trackEvent(
    prisma: PrismaClient,
    data: TrackEventInput
) {
    const ipHash = data.ip
        ? crypto
            .createHash('sha256')
            .update(data.ip)
            .digest('hex')
        : null;

    return prisma.engagementEvent.create({
        data: {
            userId: data.userId,

            viewerId: data.viewerId,
            cardId: data.cardId,

            eventType: data.eventType,

            platform: data.platform,
            source: data.source,

            ipHash,
            userAgent: data.userAgent,

            metadata: data.metadata
        }
    });
}