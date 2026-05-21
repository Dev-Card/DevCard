import type { FastifyContextConfig, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';
import type { PlatformLink } from '@devcard/shared';
import { getErrorMessage } from '../utils/error.util.js';
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


export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───
  app.get('/:username', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute'
      }
    } as FastifyContextConfig
  }, async (request: FastifyRequest<{ Params: { username: string }; Querystring: { source?: string } }>, reply: FastifyReply) => {
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

    // Try to extract viewer from Authorization header (soft auth)
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

    const response: UsernamePublicProfileResponse = {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      pronouns: user.pronouns,
      role: user.role,
      company: user.company,
      avatarUrl: user.avatarUrl,
      accentColor: user.accentColor,
      links: user.platformLinks.map((link: PlatformLink) => ({
        id: link.id,
        platform: link.platform,
        username: link.username,
        url: link.url,
        displayOrder: link.displayOrder,
        followed: followedLinkIds.includes(link.id),
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
    }

    return response; 

  });

  // ─── Public Card View ───
  app.get('/:username/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute'
      }
    } as FastifyContextConfig
  }, async (request: FastifyRequest<{ Params: { username: string; cardId: string }; Querystring: { source?: string } }>, reply: FastifyReply) => {
    /**
     * GET /api/public/:username/card/:cardId
     * Returns full owner profile + specific card data.
     * Used when viewing a card through username + cardId (e.g. QR code scans).
    */
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
      }).catch((err: unknown) => app.log.error(`Failed to log view: ${getErrorMessage(err)}`));
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
    }
    return response; 
  });

  // ─── QR Code Generation ───

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
