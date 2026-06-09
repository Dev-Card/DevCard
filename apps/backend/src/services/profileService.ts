import { getProfileUrl } from '@devcard/shared';

import { getErrorMessage } from '../utils/error.util.js';

import type { FastifyInstance } from 'fastify';

const profileCacheKey = (username: string): string => `profile:${username}`;

async function invalidateProfileCacheForUser(
  app: FastifyInstance,
  userId: string,
): Promise<void> {
  if (!app.redis) {
    return;
  }
  try {
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (user) {
      await app.redis.del(profileCacheKey(user.username));
    }
  } catch (err: unknown) {
    app.log.warn(
      `Failed to invalidate profile cache for user ${userId}: ${getErrorMessage(err)}`,
    );
  }
}

export async function getOwnProfile(
  app: FastifyInstance,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    include: {
      platformLinks: { orderBy: { displayOrder: 'asc' } },
      cards: { where: { isDefault: true }, select: { id: true }, take: 1 },
    },
  });
  if (!user) {
    return null;
  }
  const { provider: _provider, providerId: _providerId, ...profileData } = user as any;
  return { ...profileData, defaultCardId: (user as any).cards[0]?.id || null };
}

export async function updateProfile(
  app: FastifyInstance,
  userId: string,
  data: any,
): Promise<Record<string, unknown>> {
  if (data.username) {
    const existing = await app.prisma.user.findFirst({
      where: { username: data.username, NOT: { id: userId } },
    });
    if (existing) {
      throw Object.assign(new Error('Username taken'), { code: 'P2002' });
    }
  }
  const currentUser = await app.prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  try {
    const response = await app.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        pronouns: true,
        role: true,
        company: true,
        avatarUrl: true,
        accentColor: true,
      },
    });
    if (app.redis && currentUser) {
      app.redis
        .del(profileCacheKey(currentUser.username))
        .catch((err: unknown) =>
          app.log.warn(`Failed to invalidate profile cache: ${getErrorMessage(err)}`),
        );
    }
    return response;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw err;
    }
    app.log.error({ err }, 'DB error in updateProfile');
    throw err;
  }
}

export async function createPlatformLink(
  app: FastifyInstance,
  userId: string,
  linkData: any,
): Promise<Record<string, unknown>> {
  const url = linkData.url || getProfileUrl(linkData.platform, linkData.username);
  const maxOrder = await app.prisma.platformLink.aggregate({
    where: { userId },
    _max: { displayOrder: true },
  });
  const link = await app.prisma.platformLink.create({
    data: {
      userId,
      platform: linkData.platform,
      username: linkData.username,
      url,
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
    },
  });
  await invalidateProfileCacheForUser(app, userId);
  return link;
}

export async function updatePlatformLink(
  app: FastifyInstance,
  userId: string,
  id: string,
  linkData: any,
): Promise<Record<string, unknown> | null> {
  const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } });
  if (!existing) {
    return null;
  }
  const url = linkData.url || getProfileUrl(linkData.platform, linkData.username);
  const updated = await app.prisma.platformLink.update({
    where: { id },
    data: { platform: linkData.platform, username: linkData.username, url },
  });
  await invalidateProfileCacheForUser(app, userId);
  return updated;
}

export async function deletePlatformLink(
  app: FastifyInstance,
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await app.prisma.platformLink.findFirst({ where: { id, userId } });
  if (!existing) {
    return false;
  }
  await app.prisma.platformLink.delete({ where: { id } });
  await invalidateProfileCacheForUser(app, userId);
  return true;
}

export async function reorderLinks(
  app: FastifyInstance,
  userId: string,
  links: Array<{ id: string; displayOrder: number }>,
): Promise<{ message: string }> {
  await app.prisma.$transaction(
    links.map((link) =>
      app.prisma.platformLink.updateMany({
        where: { id: link.id, userId },
        data: { displayOrder: link.displayOrder },
      }),
    ),
  );
  await invalidateProfileCacheForUser(app, userId);
  return { message: 'Links reordered' };
}
