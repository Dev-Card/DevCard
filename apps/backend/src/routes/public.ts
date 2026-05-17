import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

type PublicProfileLink = {
  id: string;
  platform: string;
  username: string; 
  url: string; 
  displayOrder: number; 
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

type CachedPublicProfile = {
  ownerId: string;
  profile: UsernamePublicProfileResponse;
}

const PROFILE_CACHE_TTL_SECONDS = 300;
const QR_SESSION_TTL_SECONDS = 600;
const PUBLIC_PROFILE_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=60';

function profileCacheKey(username: string) {
  return `profile:${username}`;
}

function buildUsernamePublicProfile(user: any): UsernamePublicProfileResponse {
  return {
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    pronouns: user.pronouns,
    role: user.role,
    company: user.company,
    avatarUrl: user.avatarUrl,
    accentColor: user.accentColor,
    links: user.platformLinks.map((link: any) => ({
      id: link.id,
      platform: link.platform,
      username: link.username,
      url: link.url,
      displayOrder: link.displayOrder,
    })),
  }
}

async function getCachedProfile(app: FastifyInstance, username: string): Promise<CachedPublicProfile | null> {
  try {
    const cached = await app.redis.get(profileCacheKey(username));
    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as CachedPublicProfile;
  } catch (err) {
    app.log.warn({ err, username }, 'Failed to read public profile cache');
    return null;
  }
}

async function cacheProfile(app: FastifyInstance, username: string, payload: CachedPublicProfile) {
  try {
    await app.redis.setex(profileCacheKey(username), PROFILE_CACHE_TTL_SECONDS, JSON.stringify(payload));
  } catch (err) {
    app.log.warn({ err, username }, 'Failed to write public profile cache');
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

  const payload = {
    ownerId: user.id,
    profile: buildUsernamePublicProfile(user),
  };

  await cacheProfile(app, username, payload);

  return { cacheStatus: 'MISS' as const, payload };
}

async function getViewerId(request: FastifyRequest, ownerId: string) {
  try {
    if (request.headers.authorization) {
      const decoded = await request.jwtVerify() as any;
      if (decoded?.id !== ownerId) {
        return decoded.id;
      }
    }
  } catch (e) {
    // Ignored if invalid token
  }

  return null;
}

async function trackProfileView(app: FastifyInstance, request: FastifyRequest, ownerId: string, viewerId: string | null) {
  if (viewerId === ownerId) {
    return;
  }

  app.prisma.cardView.create({
    data: {
      ownerId,
      cardId: null,
      viewerId,
      viewerIp: request.ip || null,
      viewerAgent: request.headers['user-agent'] || null,
      source: (request.query as any)?.source || 'link',
    },
  }).catch((err: unknown) => app.log.error({ err }, 'Failed to log view'));
}

export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───
  /**
   * GET /api/public/:username
   * Returns the public profile information for a user.
  */
  app.get('/:username', async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.params;

    const resolved = await resolvePublicProfile(app, username);
    if (!resolved) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const viewerId = await getViewerId(request, resolved.payload.ownerId);
    await trackProfileView(app, request, resolved.payload.ownerId, viewerId);

    return reply
      .header('Cache-Control', PUBLIC_PROFILE_CACHE_CONTROL)
      .header('X-Cache', resolved.cacheStatus)
      .send(resolved.payload.profile);

  });

  /**
   * GET /api/public/:username/qr-session
   * Returns a short-lived signed token carrying a public profile snapshot.
  */
  app.get('/:username/qr-session', async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
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
      { expiresIn: `${QR_SESSION_TTL_SECONDS}s` }
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
      links: card.cardLinks.map((cl: any) => ({
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
  app.get('/:username/card/:cardId', async (request: FastifyRequest<{ Params: { username: string; cardId: string } }>, reply: FastifyReply) => {
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

    let viewerId = null;
    try {
      if (request.headers.authorization) {
        const decoded = await request.jwtVerify() as any;
        if (decoded?.id !== user.id) {
          viewerId = decoded.id;
        }
      }
    } catch (e) {}

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
      }).catch((err: unknown) => app.log.error({ err }, 'Failed to log card view'));
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
      links: card.cardLinks.map((cl: any) => ({
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
    const format = (request.query as any).format || 'png';
    const size = parseInt((request.query as any).size || '400', 10);

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
