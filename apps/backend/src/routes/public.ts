import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';
import type { PlatformLink } from '@devcard/shared';
import { getErrorMessage } from '../utils/error.util.js';


// ── QR size bounds ────────────────────────────────────────────────────────────
// Enforced before any DB query or image allocation.  Values outside this range
// are rejected with 400 so a single unauthenticated request cannot trigger an
// unbounded memory allocation in the QR rasteriser.
const MIN_QR_SIZE = 1;
const MAX_QR_SIZE = 2048;

// ── Cache constants ───────────────────────────────────────────────────────────
// Public profile cache TTL matches the Cache-Control max-age (5 minutes).
// The QR session JWT TTL is 10 minutes so an offline scan remains valid well
// beyond the HTTP cache window.
const PROFILE_CACHE_TTL = 300; // seconds (5 minutes)
const CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=60';

type PublicProfileLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
  followed?: boolean;
}

type UsernamePublicProfileResponse = {
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  links: PublicProfileLink[]
}

type PublicProfileCardLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  followed?: boolean;
}

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
  links: PublicProfileCardLink[]
}

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
  links: PublicProfileCardLink[]
}

// Represents a CardLink record with the joined PlatformLink relation
interface CardLinkWithPlatform {
  id: string;
  displayOrder: number;
  platformLink: PlatformLink;
}

// ── Internal Redis cache shape ────────────────────────────────────────────────
// Extends the public response with the owner's DB id so that background view
// tracking can still fire on cache-HIT requests without an extra DB read.
type CachedProfileEntry = UsernamePublicProfileResponse & { _userId: string };


export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───────────────────────────────────────────────────────
  // ─── Public Profile ───
 /**
   * GET /api/u/:username
   * Returns the public profile information for a user.
   */
  app.get('/:username', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    },
  }, async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.params;
    const cacheKey = `profile:${username}`;

    // Try to extract viewer from Authorization header (soft auth).
    // Done before the cache check so viewerId is available for both paths.
    let viewerId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        viewerId = decoded?.id ?? null;
      } else {
        viewerId = null; // Unauthenticated viewer
      }
    } catch {
      // Ignored if invalid token
    }

    // ── Redis cache read ──────────────────────────────────────────────────
    if (app.redis) {
      try {
        const cached = await app.redis.get(cacheKey);
        if (cached) {
          const { _userId, ...profileData }: CachedProfileEntry = JSON.parse(cached);

          // Background view tracking still fires on cache HITs so analytics
          // counts are not lost when the profile is served from cache.
          if (viewerId && viewerId !== _userId) {
            app.prisma.cardView.create({
              data: {
                ownerId: _userId,
                cardId: null,
                viewerId,
                viewerIp: request.ip || null,
                viewerAgent: request.headers['user-agent'] || null,
                source: request.query?.source || 'link',
              },
            }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`));
          }

          reply
            .header('X-Cache', 'HIT')
            .header('Cache-Control', CACHE_CONTROL_HEADER);
          return profileData;
        }
      } catch (err) {
        // A Redis failure must not break the request — fall through to DB.
        app.log.warn(`Redis cache read failed for ${cacheKey}: ${getErrorMessage(err)}`);
      }
    }

    // ── DB fetch (cache MISS) ─────────────────────────────────────────────
    const user = await app.prisma.user.findUnique({
      where: { username },
      include: {
        platformLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Don't track if the owner is viewing their own profile
    if (viewerId && viewerId !== user.id) {
      // Background view tracking
      app.prisma.cardView.create({
        data: {
          ownerId: user.id,
          cardId: null, // this is a profile view, not a card view
          viewerId,
          viewerIp: request.ip || null,
          viewerAgent: request.headers['user-agent'] || null,
          source: request.query?.source || 'link',
        },
      }).catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`));
    }

    // Fetch viewer's successful follow logs for this profile's links
    let followedLinkIds: string[] = [];
    if (viewerId && user.platformLinks.length > 0) {
      const successfulFollows = await app.prisma.followLog.findMany({
        where: {
          followerId: viewerId,
          status: 'success',
          OR: user.platformLinks.map((link: PlatformLink) => ({
            platform: link.platform,
            targetUsername: link.username,
          })),
        },
        select: {
          platform: true,
          targetUsername: true,
        },
      });

      followedLinkIds = user.platformLinks
        .filter((link: PlatformLink) =>
          successfulFollows.some((f: { platform: string; targetUsername: string }) =>
            f.platform === link.platform &&
            f.targetUsername.toLowerCase() === link.username.toLowerCase()
          )
        )
        .map((link: PlatformLink) => link.id);
    }

    // Base link list without viewer-specific followed state — this is what we
    // cache so the same Redis entry is valid for every caller.
    const baseLinks = user.platformLinks.map((link: PlatformLink) => ({
      id: link.id,
      platform: link.platform,
      username: link.username,
      url: link.url,
      displayOrder: link.displayOrder,
      followed: false,
    }));

    // ── Populate Redis cache ──────────────────────────────────────────────
    if (app.redis) {
      const entry: CachedProfileEntry = {
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

    const response: UsernamePublicProfileResponse = {
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

    reply
      .header('X-Cache', 'MISS')
      .header('Cache-Control', CACHE_CONTROL_HEADER);
    return response;
  });

  /**
   * GET /api/public/card/:cardId
   * Returns public data for a shared card via its direct link.
   * Used for standalone card sharing (minimal owner info).
  */
  // ─── Shared Card View (Direct) ───

  app.get('/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute'
      }
    } as FastifyContextConfig
  }, async (request: FastifyRequest<{ Params: { cardId: string } }>, reply: FastifyReply) => {
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

  // ─── Public Card View ─────────────────────────────────────────────────────
  // ─── Public Card View ───
  /**
   * GET /api/u/:username/card/:cardId
   * Returns full owner profile + specific card data.
   * Used when viewing a card through username + cardId (e.g. QR code scans).
   */
  app.get('/:username/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    },
  }, async (request: FastifyRequest<{ Params: { username: string; cardId: string } }>, reply: FastifyReply) => {
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

    let viewerId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        viewerId = decoded?.id ?? null;
      }
    } catch {
      // Ignored if invalid token
    }

    if (viewerId && viewerId !== user.id) {
      app.prisma.cardView.create({
        data: {
          ownerId: user.id,
          cardId: card.id,
          viewerId,
          viewerIp: request.ip || null,
          viewerAgent: request.headers['user-agent'] || null,
          source: request.query?.source || 'qr',
        },
      }).catch((error: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(error)}`));
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

  // ─── QR Session ──────────────────────────────────────────────────────────
  // Returns a short-lived signed JWT encoding the public profile snapshot.
  // Intended for native apps to generate QR codes that remain scannable when
  // the device has no live network connectivity (offline QR mode, spec §5.9).
  app.get('/:username/qr-session', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    } as FastifyContextConfig
  }, async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.params;
    const cacheKey = `profile:${username}`;

    let snapshot: UsernamePublicProfileResponse | null = null;

    // Prefer the Redis-cached profile so the DB is not hit on repeat calls.
    if (app.redis) {
      try {
        const cached = await app.redis.get(cacheKey);
        if (cached) {
          const { _userId: _id, ...profileData }: CachedProfileEntry = JSON.parse(cached);
          snapshot = profileData;
        }
      } catch (err) {
        app.log.warn(`Redis cache read failed for qr-session:${username}: ${getErrorMessage(err)}`);
      }
    }

    // Cache miss — fetch from DB and back-fill the cache.
    if (!snapshot) {
      const user = await app.prisma.user.findUnique({
        where: { username },
        include: { platformLinks: { orderBy: { displayOrder: 'asc' } } },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const baseLinks = user.platformLinks.map((link: PlatformLink) => ({
        id: link.id,
        platform: link.platform,
        username: link.username,
        url: link.url,
        displayOrder: link.displayOrder,
        followed: false,
      }));

      snapshot = {
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

      if (app.redis) {
        const entry: CachedProfileEntry = { _userId: user.id, ...snapshot };
        app.redis
          .set(cacheKey, JSON.stringify(entry), 'EX', PROFILE_CACHE_TTL)
          .catch((err: unknown) => app.log.warn(`Redis cache write failed for ${cacheKey}: ${getErrorMessage(err)}`));
      }
    }

    const expiresIn = 600; // 10 minutes in seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const token = app.jwt.sign(
      { profile: snapshot, sub: username },
      { expiresIn: '10m' }
    );

    reply.header('Cache-Control', CACHE_CONTROL_HEADER);
    return { token, tokenType: 'JWT', expiresIn, expiresAt };
  });

  // ─── QR Code Generation ───────────────────────────────────────────────────

  app.get('/:username/qr', {
    config: {
      rateLimit: {
        max: 50, // Lower limit for QR generation as it's more resource intensive
        timeWindow: '1 minute'
      }
    } as FastifyContextConfig
  }, async (request: FastifyRequest<{
    Params: { username: string };
    Querystring: { format?: string; size?: string };
  }>, reply: FastifyReply) => {
    const { username } = request.params;
    const format = (request.query as any).format || 'png';

    // Parse and validate size before touching the DB or allocating any buffers.
    // parseInt safely handles non-numeric strings (returns NaN) and ignores any
    // trailing fractional part, so '400.9' → 400 which is within bounds.
    const rawSize = (request.query as any).size;
    const size = rawSize !== undefined ? parseInt(rawSize, 10) : 400;

    if (!Number.isInteger(size) || size < MIN_QR_SIZE || size > MAX_QR_SIZE) {
      return reply.status(400).send({
        error: `QR size must be an integer between ${MIN_QR_SIZE} and ${MAX_QR_SIZE}`,
      });
    }

    // Verify user exists
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
    } catch (error) {
      app.log.error({ error, username, size, format }, 'QR generation failed');
      return reply.status(500).send({ error: 'QR code generation failed' });
    }
  });
}
