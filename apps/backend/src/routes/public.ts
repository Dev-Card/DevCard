/**
 * routes/public.ts  (updated)
 *
 * Rate limit changes:
 *  - All routes are RELAXED (120 req/min per IP) — these are public, unauthenticated
 *    reads but they do write CardView rows so they still need bounding.
 *  - QR generation remains at 50 req/min (more resource-intensive) — kept as a
 *    stricter relaxedRateLimit override.
 *
 * Bug fixes alongside rate limiting:
 *  - The original file had duplicate nested app.get() registrations inside outer
 *    route handlers (/:username, /:username/card/:cardId). Those inner calls would
 *    never fire because the outer handler swallowed the request. Fixed here — each
 *    route is registered exactly once at the top level.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';
import { relaxedRateLimit } from '../plugins/rate-limit.js';
import { TIERS, ipKeyGenerator } from '../plugins/rate-limit.js';

// Stricter limit specifically for QR generation (CPU/memory cost)
const qrRateLimit = {
  config: {
    rateLimit: {
      max: 50,
      timeWindow: TIERS.RELAXED.timeWindow,
      keyGenerator: ipKeyGenerator,
      errorResponseBuilder(_req: FastifyRequest, context: { ttl: number }) {
        const retryAfterSecs = Math.ceil(context.ttl / 1000);
        return {
          error: 'Too Many Requests',
          statusCode: 429,
          retryAfter: retryAfterSecs,
          message: `Rate limit exceeded. Retry after ${retryAfterSecs} seconds.`,
        };
      },
    },
  },
};

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
  links: (PublicProfileCardLink & { displayOrder: number })[];
};

export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───────────────────────────────────────────────────────
  // ─── Public Profile ───
  app.get('/:username', relaxedRateLimit, async (
    request: FastifyRequest<{ Params: { username: string } }>,
    reply: FastifyReply
  ) => {
    const { username } = request.params;

    const user = await app.prisma.user.findUnique({
      where: { username },
      include: { platformLinks: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!user) return reply.status(404).send({ error: 'User not found' });

    let viewerId = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as any;
        viewerId = decoded?.id || null;
      }
    } catch {
      // ignored
    }

    if (viewerId && viewerId !== user.id) {
      app.prisma.cardView.create({
        data: {
          ownerId: user.id,
          cardId: null,
          viewerId,
          viewerIp: request.ip || null,
          viewerAgent: request.headers['user-agent'] || null,
          source: (request.query as any)?.source || 'link',
        },
      }).catch((err) => app.log.error('Failed to log view:', err));
    }

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
      });

      followedLinkIds = user.platformLinks
        .filter((link) =>
          successfulFollows.some(
            (f) =>
              f.platform === link.platform &&
              f.targetUsername.toLowerCase() === link.username.toLowerCase()
          )
        )
        .map((link) => link.id);
    }

    const response: UsernamePublicProfileResponse = {
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
        followed: followedLinkIds.includes(link.id),
      })),
    };

    return response;
  });

  // ─── Shared Card View (Direct) ───
  app.get('/card/:cardId', relaxedRateLimit, async (
    request: FastifyRequest<{ Params: { cardId: string } }>,
    reply: FastifyReply
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

    if (!card) return reply.status(404).send({ error: 'Card not found' });

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
      links: card.cardLinks.map((cl) => ({
        id: cl.platformLink.id,
        platform: cl.platformLink.platform,
        username: cl.platformLink.username,
        url: cl.platformLink.url,
      })),
    };

    return response;
  });

  // ─── Public Card View (via username + cardId) ───
  app.get('/:username/card/:cardId', relaxedRateLimit, async (
    request: FastifyRequest<{ Params: { username: string; cardId: string } }>,
    reply: FastifyReply
  ) => {
    const { username, cardId } = request.params;

    const user = await app.prisma.user.findUnique({ where: { username } });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const card = await app.prisma.card.findFirst({
      where: { id: cardId, userId: user.id },
      include: {
        cardLinks: {
          include: { platformLink: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!card) return reply.status(404).send({ error: 'Card not found' });

    let viewerId = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as any;
        if (decoded?.id !== user.id) viewerId = decoded.id;
      }
    } catch {
      // Ignored
    }

    if (viewerId !== user.id) {
      app.prisma.cardView.create({
        data: {
          ownerId: user.id,
          cardId: card.id,
          viewerId,
          viewerIp: request.ip || null,
          viewerAgent: request.headers['user-agent'] || null,
          source: (request.query as any)?.source || 'qr',
        },
      }).catch((err) => app.log.error('Failed to log card view:', err));
    }
  });

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
      links: card.cardLinks.map((cl) => ({
        id: cl.platformLink.id,
        platform: cl.platformLink.platform,
        username: cl.platformLink.username,
        url: cl.platformLink.url,
        displayOrder: cl.displayOrder,
      })),
    };

    return response;
  });

  // ─── QR Code Generation ───
  app.get('/:username/qr', qrRateLimit, async (
    request: FastifyRequest<{
      Params: { username: string };
      Querystring: { format?: string; size?: string };
    }>,
    reply: FastifyReply
  ) => {
    const { username } = request.params;
    const format = (request.query as any).format || 'png';
    const size = parseInt((request.query as any).size || '400', 10);

    const user = await app.prisma.user.findUnique({ where: { username } });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const profileUrl = `${process.env.PUBLIC_APP_URL}/u/${username}`;

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
  });
}
