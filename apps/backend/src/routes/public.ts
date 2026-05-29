import { PLATFORMS } from '@devcard/shared';

import * as publicService from '../services/publicService.js';
import { getErrorMessage } from '../utils/error.util.js';
import { generateOgImage } from '../utils/og-image.js';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

import type { PlatformLink } from '@devcard/shared';
import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ── QR size bounds ────────────────────────────────────────────────────────────
// Enforced before any DB query or image allocation.  Values outside this range
// are rejected with 400 so a single unauthenticated request cannot trigger an
// unbounded memory allocation in the QR rasteriser.
const MIN_QR_SIZE = 1;
const MAX_QR_SIZE = 2048;

const CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=60';

// Represents a CardLink record with the joined PlatformLink relation
interface CardLinkWithPlatform {
  id: string;
  displayOrder: number;
  platformLink: PlatformLink;
}

export async function publicRoutes(app: FastifyInstance): Promise<void> {
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
    // Try to extract viewer from Authorization header (soft auth).
    let viewerId: string | null = null
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string }
        viewerId = decoded?.id ?? null
      } else {
        viewerId = null
      }
    } catch {
      // ignored
    }

    try {
      const result = await publicService.getPublicProfile(app, username, viewerId, request)
      if (!result) {
        return reply.status(404).send({ error: 'User not found' })
      }
      reply.header('X-Cache', result.cached ? 'HIT' : 'MISS').header('Cache-Control', CACHE_CONTROL_HEADER)
      return result.data
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch public profile')
      return reply.status(500).send({ error: 'Internal server error' })
    }
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

    try {
      const card = await publicService.getCardById(app, cardId)
      if (!card) {
        return reply.status(404).send({ error: 'Card not found' })
      }
      const response = { id: card.id, title: card.title, owner: { username: card.user.username, displayName: card.user.displayName, bio: card.user.bio, avatarUrl: card.user.avatarUrl, accentColor: card.user.accentColor }, links: card.cardLinks.map((cl: CardLinkWithPlatform) => ({ id: cl.platformLink.id, platform: cl.platformLink.platform, username: cl.platformLink.username, url: cl.platformLink.url })) }
      return response
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch shared card')
      return reply.status(500).send({ error: 'Internal server error' })
    }
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

    let viewerId: string | null = null
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string }
        viewerId = decoded?.id ?? null
      }
    } catch {
      // ignored
    }

    try {
      const result = await publicService.getUserCard(app, username, cardId, viewerId, request)
      if (result.notFound) {
        return reply.status(404).send({ error: 'User or card not found' })
      }
      return result.data
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch user card')
      return reply.status(500).send({ error: 'Internal server error' })
    }
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
    try {
      const result = await publicService.getPublicProfile(app, username, null, request)
      if (!result) {
        return reply.status(404).send({ error: 'User not found' })
      }
      const snapshot = result.data
      const expiresIn = 600
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
      const token = app.jwt.sign({ profile: snapshot, sub: username }, { expiresIn: '10m' })
      reply.header('Cache-Control', CACHE_CONTROL_HEADER)
      return { token, tokenType: 'JWT', expiresIn, expiresAt }
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to create qr-session')
      return reply.status(500).send({ error: 'Internal server error' })
    }
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
    const format = request.query.format || 'png';

    // Parse and validate size before touching the DB or allocating any buffers.
    // parseInt safely handles non-numeric strings (returns NaN) and ignores any
    // trailing fractional part, so '400.9' → 400 which is within bounds.
    const rawSize = request.query.size;
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
        const svg = await generateQRSvg(profileUrl, { width: size })
        return reply.header('Content-Type', 'image/svg+xml').header('Content-Disposition', `inline; filename="devcard-${username}.svg"`).send(svg)
      }
      const png = await generateQRBuffer(profileUrl, { width: size })
      return reply.header('Content-Type', 'image/png').header('Content-Disposition', `inline; filename="devcard-${username}.png"`).send(png)
    } catch (error) {
      app.log.error({ error, username, size, format }, 'QR generation failed')
      return reply.status(500).send({ error: 'QR code generation failed' })
    }
  });

  // ─── OG Image ─────────────────────────────────────────────────────────────
  /**
   * GET /api/u/:username/og-image
   * Returns a 1200×630 PNG social-preview card for the user's public profile.
   * Used as the og:image / twitter:image value so that sharing a DevCard URL
   * on Slack, Twitter, Discord, or WhatsApp renders a rich link preview.
   *
   * Cache strategy: Redis for 24 h (86400 s) keyed by `og-image:<username>`.
   * X-Cache: HIT / MISS response header signals which path was taken.
   */
  app.get('/:username/og-image', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (
    request: FastifyRequest<{ Params: { username: string } }>,
    reply: FastifyReply,
  ) => {
    const { username } = request.params;
    const cacheKey = `og-image:${username}`;
    const ogCacheControl = 'public, max-age=86400, stale-while-revalidate=3600';

    // ── Redis cache HIT ──────────────────────────────────────────────────────
    if (app.redis) {
      try {
        const cached = await app.redis.get(cacheKey);
        if (cached) {
          const buf = Buffer.from(cached, 'base64');
          return reply
            .header('Content-Type', 'image/png')
            .header('Cache-Control', ogCacheControl)
            .header('X-Cache', 'HIT')
            .send(buf);
        }
      } catch (err: unknown) {
        app.log.warn(`OG image cache read failed for ${cacheKey}: ${getErrorMessage(err)}`);
      }
    }

    try {
      // ── DB lookup ──────────────────────────────────────────────────────────
      const user = await app.prisma.user.findUnique({
        where: { username },
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          accentColor: true,
          _count: { select: { platformLinks: true } },
          platformLinks: {
            select: { platform: true },
            orderBy: { displayOrder: 'asc' },
            take: 4,
          },
        },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // ── PNG generation ─────────────────────────────────────────────────────
      const png = await generateOgImage({
        username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        accentColor: user.accentColor,
        platforms: user.platformLinks.map((link: { platform: string }) => {
          const platform = PLATFORMS[link.platform];
          return {
            name: platform?.name ?? link.platform,
            color: platform?.color ?? user.accentColor,
            icon: platform?.icon ?? link.platform,
          };
        }),
        platformCount: user._count.platformLinks,
      });

      // ── Redis cache write ──────────────────────────────────────────────────
      if (app.redis) {
        app.redis
          .set(cacheKey, png.toString('base64'), 'EX', 86400)
          .catch((err: unknown) =>
            app.log.warn(`OG image cache write failed for ${cacheKey}: ${getErrorMessage(err)}`),
          );
      }

      return reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', ogCacheControl)
        .header('X-Cache', 'MISS')
        .send(png);
    } catch (err: unknown) {
      app.log.error({ err, message: getErrorMessage(err) }, 'OG image generation failed');
      return reply.status(500).send({ error: 'Failed to generate OG image' });
    }
  });
}
