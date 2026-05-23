import { getErrorMessage, logBackgroundError } from '../utils/error.util.js';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

import type { PlatformLink } from '@devcard/shared';
import type { Prisma } from '@prisma/client';
import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';



// ── QR size bounds ────────────────────────────────────────────────────────────
const MIN_QR_SIZE = 1;
const MAX_QR_SIZE = 2048;

type PublicProfileLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
  followed?: boolean;
};

type UsernamePublicProfileResponse = {
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  links: PublicProfileLink[];
};

type PublicProfileCardLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  followed?: boolean;
};

type CardPublicProfileResponse = {
  id: string;
  title: string;
  owner: {
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    accentColor: string;
  };
  links: PublicProfileCardLink[];
};

type UsernameCardPublicProfileResponse = {
  title: string;
  owner: {
    username: string;
    displayName: string;
    bio: string | null;
    pronouns: string | null;
    role: string | null;
    company: string | null;
    avatarUrl: string | null;
    accentColor: string;
  };
  links: PublicProfileCardLink[];
};

type CachedPublicProfile = {
  ownerId: string;
  profile: UsernamePublicProfileResponse;
};

type UserWithPlatformLinks = Prisma.UserGetPayload<{
  include: {
    platformLinks: {
      orderBy: { displayOrder: 'asc' };
    };
  };
}>;

interface CardLinkWithPlatform {
  id: string;
  displayOrder: number;
  platformLink: PlatformLink;
}

const PROFILE_CACHE_TTL_SECONDS = 300;
const QR_SESSION_TTL_SECONDS = 600;
const PUBLIC_PROFILE_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=60';

function profileCacheKey(username: string) {
  return `profile:${username}`;
}

function buildUsernamePublicProfile(user: UserWithPlatformLinks): UsernamePublicProfileResponse {
  return {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    pronouns: user.pronouns,
    role: user.role,
    company: user.company,
    avatarUrl: user.avatarUrl,
    accentColor: user.accentColor,
    links: user.platformLinks.map((link) => ({
      id: link.id,
      platform: link.platform,
      username: link.username,
      url: link.url,
      displayOrder: link.displayOrder,
    })),
  };
}

async function getCachedProfile(app: FastifyInstance, username: string): Promise<CachedPublicProfile | null> {
  try {
    const cached = await app.redis.get(profileCacheKey(username));
    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as CachedPublicProfile;
  } catch (err) {
    app.log.warn({ err: getErrorMessage(err), username }, 'Failed to read public profile cache');
    return null;
  }
}

async function cacheProfile(app: FastifyInstance, username: string, payload: CachedPublicProfile) {
  try {
    await app.redis.setex(profileCacheKey(username), PROFILE_CACHE_TTL_SECONDS, JSON.stringify(payload));
  } catch (err) {
    app.log.warn({ err: getErrorMessage(err), username }, 'Failed to write public profile cache');
  }
}

async function resolvePublicProfile(app: FastifyInstance, username: string) {
  const cached = await getCachedProfile(app, username);
  if (cached) {
    return { cacheStatus: 'HIT' as const, payload: cached };
  }

  const user = await app.prisma.user.findUnique({
    where: { username },
    include: {
      platformLinks: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!user) {
    return null;
  }

  const payload: CachedPublicProfile = {
    ownerId: user.id,
    profile: buildUsernamePublicProfile(user),
  };

  await cacheProfile(app, username, payload);

  return { cacheStatus: 'MISS' as const, payload };
}

async function getViewerId(request: FastifyRequest, ownerId: string): Promise<string | null> {
  try {
    if (request.headers.authorization) {
      const decoded = (await request.jwtVerify()) as { id?: string };
      if (decoded?.id && decoded.id !== ownerId) {
        return decoded.id;
      }
    }
  } catch {
    // Ignored if invalid token
  }

  return null;
}

async function enrichProfileWithFollowedLinks(
  app: FastifyInstance,
  profile: UsernamePublicProfileResponse,
  viewerId: string | null,
): Promise<UsernamePublicProfileResponse> {
  if (!viewerId || profile.links.length === 0) {
    return profile;
  }

  const successfulFollows = await app.prisma.followLog.findMany({
    where: {
      followerId: viewerId,
      status: 'success',
      OR: profile.links.map((link) => ({
        platform: link.platform,
        targetUsername: link.username,
      })),
    },
    select: {
      platform: true,
      targetUsername: true,
    },
  });

  const followedLinkIds = profile.links
    .filter((link) =>
      successfulFollows.some(
        (f) =>
          f.platform === link.platform &&
          f.targetUsername.toLowerCase() === link.username.toLowerCase(),
      ),
    )
    .map((link) => link.id);

  return {
    ...profile,
    links: profile.links.map((link) => ({
      ...link,
      followed: followedLinkIds.includes(link.id),
    })),
  };
}

function trackProfileView(
  app: FastifyInstance,
  request: FastifyRequest<{ Querystring: { source?: string } }>,
  ownerId: string,
  viewerId: string | null,
) {
  if (!viewerId || viewerId === ownerId) {
    return;
  }

  app.prisma.cardView
    .create({
      data: {
        ownerId,
        cardId: null,
        viewerId,
        viewerIp: request.ip || null,
        viewerAgent: request.headers['user-agent'] || null,
        source: request.query?.source || 'link',
      },
    })
    .catch((err: unknown) => logBackgroundError(app.log, err, 'Failed to log view'));
}

export async function publicRoutes(app: FastifyInstance) {
  app.get('/:username', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (
    request: FastifyRequest<{ Params: { username: string }; Querystring: { source?: string } }>,
    reply: FastifyReply,
  ) => {
    const { username } = request.params;

    const resolved = await resolvePublicProfile(app, username);
    if (!resolved) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const viewerId = await getViewerId(request, resolved.payload.ownerId);
    const profile = await enrichProfileWithFollowedLinks(app, resolved.payload.profile, viewerId);
    trackProfileView(app, request, resolved.payload.ownerId, viewerId);

    return reply
      .header('Cache-Control', PUBLIC_PROFILE_CACHE_CONTROL)
      .header('X-Cache', resolved.cacheStatus)
      .send(profile);
  });

  /**
   * GET /api/public/:username/qr-session
   * Offline QR mode: returns a short-lived signed JWT embedding the public profile snapshot.
   */
  app.get('/:username/qr-session', async (
    request: FastifyRequest<{ Params: { username: string } }>,
    reply: FastifyReply,
  ) => {
    const { username } = request.params;

    const resolved = await resolvePublicProfile(app, username);
    if (!resolved) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + QR_SESSION_TTL_SECONDS;
    const token = app.jwt.sign(
      {
        type: 'qr-session',
        username,
        profile: resolved.payload.profile,
      },
      { expiresIn: `${QR_SESSION_TTL_SECONDS}s` },
    );

    return reply
      .header('Cache-Control', PUBLIC_PROFILE_CACHE_CONTROL)
      .header('X-Cache', resolved.cacheStatus)
      .send({
        token,
        tokenType: 'JWT',
        expiresIn: QR_SESSION_TTL_SECONDS,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
      });
  });

  app.get('/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (
    request: FastifyRequest<{ Params: { cardId: string } }>,
    reply: FastifyReply,
  ) => {
    const { cardId } = request.params;

    const card = await app.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        user: true,
        cardLinks: {
          include: { platformLink: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const response: CardPublicProfileResponse = {
      id: card.id,
      title: card.title,
      owner: {
        username: card.user.username,
        displayName: card.user.displayName,
        bio: card.user.bio,
        avatarUrl: card.user.avatarUrl,
        accentColor: card.user.accentColor,
      },
      links: card.cardLinks.map((cl: CardLinkWithPlatform) => ({
        id: cl.platformLink.id,
        platform: cl.platformLink.platform,
        username: cl.platformLink.username,
        url: cl.platformLink.url,
      })),
    };

    return response;
  });

  app.get('/:username/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (
    request: FastifyRequest<{ Params: { username: string; cardId: string }; Querystring: { source?: string } }>,
    reply: FastifyReply,
  ) => {
    const { username, cardId } = request.params;

    const user = await app.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const card = await app.prisma.card.findFirst({
      where: { id: cardId, userId: user.id },
      include: {
        cardLinks: {
          include: { platformLink: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const viewerId = await getViewerId(request, user.id);

    if (viewerId) {
      app.prisma.cardView
        .create({
          data: {
            ownerId: user.id,
            cardId: card.id,
            viewerId,
            viewerIp: request.ip || null,
            viewerAgent: request.headers['user-agent'] || null,
            source: request.query?.source || 'qr',
          },
        })
        .catch((err: unknown) => logBackgroundError(app.log, err, 'Failed to log card view'));
    }

    const response: UsernameCardPublicProfileResponse = {
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
      links: card.cardLinks.map((cl: CardLinkWithPlatform) => ({
        id: cl.platformLink.id,
        platform: cl.platformLink.platform,
        username: cl.platformLink.username,
        url: cl.platformLink.url,
        displayOrder: cl.displayOrder,
      })),
    };

    return response;
  });

  app.get('/:username/qr', {
    config: {
      rateLimit: {
        max: 50,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (
    request: FastifyRequest<{
      Params: { username: string };
      Querystring: { format?: string; size?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { username } = request.params;
    const format = request.query.format || 'png';
    const rawSize = request.query.size;
    const size = rawSize !== undefined ? parseInt(rawSize, 10) : 400;

    if (!Number.isInteger(size) || size < MIN_QR_SIZE || size > MAX_QR_SIZE) {
      return reply.status(400).send({
        error: `QR size must be an integer between ${MIN_QR_SIZE} and ${MAX_QR_SIZE}`,
      });
    }

    const user = await app.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const profileUrl = `${process.env.PUBLIC_APP_URL}/u/${username}`;

    try {
      if (format === 'svg') {
        const svg = await generateQRSvg(profileUrl, { width: size });
        return reply
          .header('Content-Type', 'image/svg+xml')
          .header('Content-Disposition', `inline; filename="devcard-${username}.svg"`)
          .send(svg);
      }

      const png = await generateQRBuffer(profileUrl, { width: size });
      return reply
        .header('Content-Type', 'image/png')
        .header('Content-Disposition', `inline; filename="devcard-${username}.png"`)
        .send(png);
    } catch (err) {
      app.log.error(
        { err: getErrorMessage(err), username, size, format },
        'QR generation failed',
      );
      return reply.status(500).send({ error: 'QR code generation failed' });
    }
  });
}
