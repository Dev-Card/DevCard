import type { FastifyInstance } from 'fastify';
import { getErrorMessage } from '../utils/error.util.js';
import { trackEvent } from './analytics/trackEvent.js';

const PROFILE_CACHE_TTL = 300;

function logView(
  app: FastifyInstance,
  ownerId: string,
  cardId: string | null,
  viewerId: string | null,
  request: { ip?: string; headers: Record<string, unknown>; query?: { source?: string } },
  defaultSource: string,
) {
  if (viewerId === ownerId) return;

  trackEvent(app.prisma, {
    ownerId,
    cardId,
    viewerId,
    ip: request.ip,
    userAgent:
      typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent']
        : undefined,
    source: request.query?.source || defaultSource,
  }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`));
}

export async function getPublicProfile(
  app: FastifyInstance,
  username: string,
  viewerId: string | null,
  request: { ip?: string; headers: Record<string, unknown>; query?: { source?: string } },
) {
  const cacheKey = `profile:${username}`;

  if (app.redis) {
    try {
      const cached = await app.redis.get(cacheKey);
      if (cached) {
        const { _userId, ...profileData } = JSON.parse(cached) as { _userId: string };
        logView(app, _userId, null, viewerId, request, 'link');
        return { cached: true, data: profileData, cacheKey };
      }
    } catch (err) {
      app.log.warn(`Redis cache read failed for ${cacheKey}: ${getErrorMessage(err)}`);
    }
  }

  const user = await app.prisma.user.findUnique({
    where: { username },
    include: { platformLinks: { orderBy: { displayOrder: 'asc' } } },
  });
  if (!user) return null;

  logView(app, user.id, null, viewerId, request, 'link');

  let followedLinkIds: string[] = [];
  if (viewerId && user.platformLinks.length > 0) {
    const successfulFollows = await app.prisma.followLog.findMany({
      where: {
        followerId: viewerId,
        status: 'success',
        OR: user.platformLinks.map((link) => ({
          platform: link.platform,
          targetUsername: link.username,
        })),
      },
      select: { platform: true, targetUsername: true },
    });
    followedLinkIds = user.platformLinks
      .filter((link) =>
        successfulFollows.some(
          (f) =>
            f.platform === link.platform &&
            f.targetUsername.toLowerCase() === link.username.toLowerCase(),
        ),
      )
      .map((link) => link.id);
  }

  const baseLinks = user.platformLinks.map((link) => ({
    id: link.id,
    platform: link.platform,
    username: link.username,
    url: link.url,
    displayOrder: link.displayOrder,
    followed: false,
  }));

  if (app.redis) {
    const entry = {
      _userId: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      pronouns: user.pronouns,
      role: user.role,
      company: user.company,
      avatarUrl: user.avatarUrl,
      accentColor: user.accentColor,
      links: baseLinks,
    };
    app.redis
      .set(cacheKey, JSON.stringify(entry), 'EX', PROFILE_CACHE_TTL)
      .catch((err: unknown) => app.log.warn(`Redis cache write failed for ${cacheKey}: ${getErrorMessage(err)}`));
  }

  const response = {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    pronouns: user.pronouns,
    role: user.role,
    company: user.company,
    avatarUrl: user.avatarUrl,
    accentColor: user.accentColor,
    links: baseLinks.map((link) => ({
      ...link,
      followed: followedLinkIds.includes(link.id),
    })),
  };

  return { cached: false, data: response, cacheKey };
}

export async function getCardById(app: FastifyInstance, cardId: string) {
  return app.prisma.card.findUnique({
    where: { id: cardId },
    include: {
      user: true,
      cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } },
    },
  });
}

export async function getUserCard(
  app: FastifyInstance,
  username: string,
  cardId: string,
  viewerId: string | null,
  request: { ip?: string; headers: Record<string, unknown>; query?: { source?: string } },
) {
  const user = await app.prisma.user.findUnique({ where: { username } });
  if (!user) return { notFound: true };

  const card = await app.prisma.card.findFirst({
    where: { id: cardId, userId: user.id },
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
  });
  if (!card) return { notFound: true };

  logView(app, user.id, card.id, viewerId, request, 'qr');

  const response = {
    title: card.title,
    owner: {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      pronouns: user.pronouns,
      role: user.role,
      company: user.company,
      avatarUrl: user.avatarUrl,
      accentColor: user.accentColor,
    },
    links: card.cardLinks.map((cl) => ({
      id: cl.platformLink.id,
      platform: cl.platformLink.platform,
      username: cl.platformLink.username,
      url: cl.platformLink.url,
      displayOrder: cl.displayOrder,
    })),
  };

  return { notFound: false, data: response };
}
