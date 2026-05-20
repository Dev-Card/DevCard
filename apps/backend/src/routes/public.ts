import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';
import { trackEvent } from '../services/analytics/trackEvent.js';

type PublicProfileLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
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

type PublicQuery = {
  source?: string;
};

type JwtPayload = {
  id: string;
};

export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───
  /**
   * GET /api/public/:username
   * Returns the public profile information for a user.
  */
  app.get('/:username', async (request: FastifyRequest<{ Params: { username: string }; Querystring: PublicQuery }>, reply: FastifyReply) => {
    const { source } = request.query;
    const { username } = request.params;

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

    let viewerId: string | null = null;
    try {
      if (request.headers.authorization) {
        const decoded = await request.jwtVerify<JwtPayload>();
        if (decoded.id !== user.id) {
          viewerId = decoded.id;
        }
      }
    } catch {
      // Ignored if invalid token
    }

    if (viewerId !== user.id) {
      trackEvent(app.prisma, {
        ownerId: user.id,
        cardId: null,
        viewerId,
        ip: request.ip,
        userAgent:
          typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent']
            : undefined,
        source: source || 'link',
      }).catch((err) => app.log.error('Failed to log view:', err));
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
      })),
    }

    return response;

  });

  /**
   * GET /api/public/card/:cardId
   * Returns public data for a shared card via its direct link.
   * Used for standalone card sharing (minimal owner info).
  */
  // ─── Shared Card View (Direct) ───

  app.get('/card/:cardId', async (request: FastifyRequest<{ Params: { cardId: string } }>, reply: FastifyReply) => {
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
      links: card.cardLinks.map((cl) => ({
        id: cl.platformLink.id,
        platform: cl.platformLink.platform,
        username: cl.platformLink.username,
        url: cl.platformLink.url,
      })),
    }

    return response;

  });

  // ─── Public Card View ───
  /**
   * GET /api/public/:username/card/:cardId
   * Returns full owner profile + specific card data.
   * Used when viewing a card through username + cardId (e.g. QR code scans).
  */
  app.get('/:username/card/:cardId', async (request: FastifyRequest<{ Params: { username: string; cardId: string }; Querystring: PublicQuery }>, reply: FastifyReply) => {
    const { source } = request.query;
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
        const decoded = await request.jwtVerify<JwtPayload>();
        if (decoded.id !== user.id) {
          viewerId = decoded.id;
        }
      }
    } catch {
      // Ignored if invalid token
    }

    if (viewerId !== user.id) {
      trackEvent(app.prisma, {
        ownerId: user.id,
        cardId: card.id,
        viewerId,
        ip: request.ip,
        userAgent:
          typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent']
            : undefined,
        source: source || 'qr',
      }).catch((err) => app.log.error('Failed to log card view:', err));
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
      links: card.cardLinks.map((cl) => ({
        id: cl.platformLink.id,
        platform: cl.platformLink.platform,
        username: cl.platformLink.username,
        url: cl.platformLink.url,
        displayOrder: cl.displayOrder,
      })),
    }
    return response;
  });

  // ─── QR Code Generation ───

  app.get('/:username/qr', async (request: FastifyRequest<{
    Params: { username: string };
    Querystring: { format?: string; size?: string };
  }>, reply: FastifyReply) => {
    const { username } = request.params;
    const format = request.query.format || 'png';
    const size = parseInt(request.query.size || '400', 10);

    // Verify user exists
    const user = await app.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

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
