import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';
import type { PlatformLink } from '@devcard/shared';
import * as publicService from '../services/publicService.js';

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
const CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=60';

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

interface CardLinkWithPlatform {
  id: string;
  displayOrder: number;
  platformLink: PlatformLink;
}

export async function publicRoutes(app: FastifyInstance) {
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

    let viewerId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        viewerId = decoded?.id ?? null;
      }
    } catch {
      // ignored
    }

    try {
      const result = await publicService.getPublicProfile(app, username, viewerId, request);
      if (!result) return reply.status(404).send({ error: 'User not found' });
      reply.header('X-Cache', result.cached ? 'HIT' : 'MISS').header('Cache-Control', CACHE_CONTROL_HEADER);
      return result.data;
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch public profile');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/public/card/:cardId
   * Returns public data for a shared card via its direct link.
   */
  app.get('/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (request: FastifyRequest<{ Params: { cardId: string } }>, reply: FastifyReply) => {
    const { cardId } = request.params;

    try {
      const card = await publicService.getCardById(app, cardId);
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
        links: card.cardLinks.map((cl: CardLinkWithPlatform) => ({
          id: cl.platformLink.id,
          platform: cl.platformLink.platform,
          username: cl.platformLink.username,
          url: cl.platformLink.url,
        })),
      };
      return response;
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch shared card');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/u/:username/card/:cardId
   * Returns full owner profile + specific card data.
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

    let viewerId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        viewerId = decoded?.id ?? null;
      }
    } catch {
      // ignored
    }

    try {
      const result = await publicService.getUserCard(app, username, cardId, viewerId, request);
      if (result.notFound) return reply.status(404).send({ error: 'User or card not found' });
      return result.data as UsernameCardPublicProfileResponse;
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch user card');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/u/:username/qr-session
   * Returns a short-lived signed JWT encoding the public profile snapshot.
   */
  app.get('/:username/qr-session', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.params;

    try {
      const result = await publicService.getPublicProfile(app, username, null, request);
      if (!result) return reply.status(404).send({ error: 'User not found' });
      const snapshot = result.data as UsernamePublicProfileResponse;
      const expiresIn = 600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const token = app.jwt.sign({ profile: snapshot, sub: username }, { expiresIn: '10m' });
      reply.header('Cache-Control', CACHE_CONTROL_HEADER);
      return { token, tokenType: 'JWT', expiresIn, expiresAt };
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to create qr-session');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ─── QR Code Generation ───

  app.get('/:username/qr', {
    config: {
      rateLimit: {
        max: 50,
        timeWindow: '1 minute',
      },
    } as FastifyContextConfig,
  }, async (request: FastifyRequest<{
    Params: { username: string };
    Querystring: { format?: string; size?: string };
  }>, reply: FastifyReply) => {
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
    } catch (error) {
      app.log.error({ error, username, size, format }, 'QR generation failed');
      return reply.status(500).send({ error: 'QR code generation failed' });
    }
  });
}
