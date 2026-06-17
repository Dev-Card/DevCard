import { getErrorMessage } from '../utils/error.util.js';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

import type { PlatformLink } from '@devcard/shared';
import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

type PublicProfileLink = {
  id: string;
  platform: string;
  username: string; 
  url: string; 
  displayOrder: number; 
  followed?: boolean;
}

type UsernamePublicProfileResponse =  {
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


export async function publicRoutes(app: FastifyInstance): Promise<void> {
  // ─── Public Profile ───
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
    let viewerId: string | null = null;
    let isSelfView = false;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        if (decoded?.id === user.id) {
          isSelfView = true;
        } else {
          viewerId = decoded?.id ?? null;
        }
      } else {
        viewerId = null;
      }
    } catch {
      // Ignored if invalid token
    }

    // Don't track if the owner is viewing their own profile
    if (!isSelfView && viewerId !== user.id) {
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
      }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`));
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

    try {
      const result = await publicService.getPublicProfile(app, username, viewerId, request);
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
  }, async (request: FastifyRequest<{ Params: { cardId: string } }>, _reply: FastifyReply) => {
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
      return _reply.status(404).send({ error: 'Card not found' });
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
    }

    return response; 

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
    let isSelfView = false;
    try {
      if (request.headers.authorization) {
        const decoded = (await request.jwtVerify()) as { id?: string };
        if (decoded?.id === user.id) {
          isSelfView = true;
        } else {
          viewerId = decoded?.id ?? null;
        }
      }
    } catch (_e) {
      // Ignored if invalid token
    }

    if (!isSelfView && viewerId !== user.id) {
      app.prisma.cardView.create({
        data: {
          ownerId: user.id,
          cardId: card.id,
          viewerId,
          viewerIp: request.ip || null,
          viewerAgent: request.headers['user-agent'] || null,
          source: request.query?.source || 'qr',
        },
      }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`));
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
      const result = await publicService.getPublicProfile(app, username, null, request);
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
