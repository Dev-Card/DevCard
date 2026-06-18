import * as publicService from '../services/publicService.js';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ── QR size bounds ────────────────────────────────────────────────────────────
const MIN_QR_SIZE = 1;
const MAX_QR_SIZE = 2048;

// ── Cache constants ───────────────────────────────────────────────────────────
const CACHE_CONTROL_HEADER = 'public, max-age=300, stale-while-revalidate=60';

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  // ─── Public Profile ───────────────────────────────────────────────────────
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

    // Soft auth: extract viewer id if token present.
    // authenticatedUserId is used to detect self-views; viewerId is only set
    // for other authenticated users so the service knows who is viewing.
    let viewerId: string | null = null;
    let authenticatedUserId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        authenticatedUserId = decoded?.id ?? null;
        viewerId = authenticatedUserId;
      }
    } catch {
      // ignored — treat as unauthenticated
    }

    try {
      const result = await publicService.getPublicProfile(app, username, viewerId, request, authenticatedUserId);
      if (!result) {
        return reply.status(404).send({ error: 'User not found' });
      }
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
      const card = await publicService.getCardById(app, cardId);
      if (!card) {
        return reply.status(404).send({ error: 'Card not found' });
      }
      const response = {
        id: card.id,
        title: card.title,
        owner: {
          username: card.user.username,
          displayName: card.user.displayName,
          bio: card.user.bio,
          avatarUrl: card.user.avatarUrl,
          accentColor: card.user.accentColor,
        },
        links: card.cardLinks.map((cl: any) => ({
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

  // ─── Public Card View ─────────────────────────────────────────────────────
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

    let viewerId: string | null = null;
    let authenticatedUserId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        authenticatedUserId = decoded?.id ?? null;
        viewerId = authenticatedUserId;
      }
    } catch {
      // ignored
    }

    try {
      const result = await publicService.getUserCard(app, username, cardId, viewerId, request, authenticatedUserId);
      if (result.notFound) {
        return reply.status(404).send({ error: 'User or card not found' });
      }
      return result.data;
    } catch (err: unknown) {
      app.log.error({ err }, 'Failed to fetch user card');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ─── QR Session ──────────────────────────────────────────────────────────
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
      const result = await publicService.getPublicProfile(app, username, null, request, null);
      if (!result) {
        return reply.status(404).send({ error: 'User not found' });
      }
      const snapshot = result.data;
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

  // ─── QR Code Generation ───────────────────────────────────────────────────

  app.get('/:username/qr', {
    config: {
      rateLimit: {
        max: 50,
        timeWindow: '1 minute'
      }
    } as FastifyContextConfig
  }, async (request: FastifyRequest<{
    Params: { username: string };
    Querystring: { format?: string; size?: string };
  }>, reply: FastifyReply) => {
    const { username } = request.params;
    const format = (request.query as any).format || 'png';

    const rawSize = (request.query as any).size;
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