import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';
import { loadFonts } from '../utils/fonts.js';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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



export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───
  app.get('/:username', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute'
      }
    }
  }, async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
  /**
   * GET /api/public/:username
   * Returns the public profile information for a user.
  */
  app.get('/:username', async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
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
    let viewerId = null;
    try {
      if (request.headers.authorization) {
        const decoded = await request.jwtVerify() as any;
        viewerId = decoded?.id || null;
      }
    } catch (e) {
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
          source: (request.query as any)?.source || 'link',
        },
      }).catch((err: any) => app.log.error('Failed to log view:', err));
    }

    // Fetch viewer's successful follow logs for this profile's links
    let followedLinkIds: string[] = [];
    if (viewerId && user.platformLinks.length > 0) {
      const successfulFollows = await app.prisma.followLog.findMany({
        where: {
          followerId: viewerId,
          status: 'success',
          OR: user.platformLinks.map(link => ({
            platform: link.platform,
            targetUsername: link.username,
          })),
        },
      });

      followedLinkIds = user.platformLinks
        .filter(link =>
          successfulFollows.some(f =>
            f.platform === link.platform &&
            f.targetUsername.toLowerCase() === link.username.toLowerCase()
          )
        )
        .map(link => link.id);
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
      links: user.platformLinks.map((link: any) => ({
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
    }
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
  app.get('/:username/card/:cardId', {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute'
      }
    }
  }, async (request: FastifyRequest<{ Params: { username: string; cardId: string } }>, reply: FastifyReply) => {
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
      }).catch((err: any) => app.log.error('Failed to log card view:', err));
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

  app.get('/:username/qr', {
    config: {
      rateLimit: {
        max: 50, // Lower limit for QR generation as it's more resource intensive
        timeWindow: '1 minute'
      }
    }
  }, async (request: FastifyRequest<{
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

  // ─── Dynamic OG Image Generation ───
  /**
   * GET /api/u/:username/og-image
   * Generates a dynamic premium PNG preview card for the user's public profile.
   * Leverages Redis cache if available.
   */
  app.get('/:username/og-image', async (request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) => {
    const { username } = request.params;

    // Check Redis cache first
    const cacheKey = `og:${username.toLowerCase()}`;
    if (app.redis && app.redis.status === 'ready') {
      try {
        const cached = await app.redis.getBuffer(cacheKey);
        if (cached) {
          app.log.info(`[OG Image] Serving cached preview for @${username}`);
          return reply
            .header('Content-Type', 'image/png')
            .header('Cache-Control', 'public, max-age=3600')
            .send(cached);
        }
      } catch (err) {
        app.log.error('Redis cache fetch error:', err as any);
      }
    }

    // Fetch user profile from DB
    const userProfile = await app.prisma.user.findUnique({
      where: { username },
      include: {
        platformLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!userProfile) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Resolve avatar and convert to base64 Data URI
    let avatarBase64: string | null = null;
    if (userProfile.avatarUrl) {
      try {
        if (userProfile.avatarUrl.startsWith('/uploads/') || userProfile.avatarUrl.includes('/uploads/')) {
          // Resolve local uploads safely
          const relativePath = userProfile.avatarUrl.startsWith('/uploads/')
            ? userProfile.avatarUrl
            : userProfile.avatarUrl.substring(userProfile.avatarUrl.indexOf('/uploads/'));
          const localPath = path.join(__dirname, '..', '..', relativePath);
          if (fs.existsSync(localPath)) {
            const fileBuffer = fs.readFileSync(localPath);
            const ext = path.extname(localPath).replace('.', '');
            avatarBase64 = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fileBuffer.toString('base64')}`;
          }
        }

        // Resolve absolute URLs
        if (!avatarBase64 && userProfile.avatarUrl.startsWith('http')) {
          const avatarRes = await fetch(userProfile.avatarUrl, { signal: AbortSignal.timeout(2000) });
          if (avatarRes.ok) {
            const arrayBuffer = await avatarRes.arrayBuffer();
            const mime = avatarRes.headers.get('content-type') || 'image/png';
            avatarBase64 = `data:${mime};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
          }
        }
      } catch (err) {
        app.log.warn(`Failed to resolve avatar for OG image generation: ${err}`);
      }
    }

    try {
      // Load fonts dynamically (regular and bold)
      const fonts = await loadFonts();

      // Render to SVG via satori
      const svg = await (satori as any)(
        {
          type: 'div',
          props: {
            style: {
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#030712',
              color: '#ffffff',
              fontFamily: 'Inter',
              padding: '60px 80px',
              position: 'relative',
            },
            children: [
              // Radial glow top center
              {
                type: 'div',
                props: {
                  style: {
                    position: 'absolute',
                    top: '-150px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '800px',
                    height: '400px',
                    borderRadius: '100%',
                    background: `radial-gradient(circle, ${userProfile.accentColor || '#6366f1'} 0%, transparent 70%)`,
                    opacity: '0.25',
                    display: 'flex',
                  }
                }
              },
              // Header row
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '28px',
                          fontWeight: 'bold',
                          letterSpacing: '-0.5px',
                        },
                        children: [
                          {
                            type: 'span',
                            props: {
                              style: {
                                color: userProfile.accentColor || '#6366f1',
                                marginRight: '8px',
                              },
                              children: '⚡'
                            }
                          },
                          {
                            type: 'span',
                            props: {
                              children: 'DevCard'
                            }
                          }
                        ]
                      }
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '999px',
                          padding: '8px 16px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#9ca3af',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        },
                        children: 'Verified Developer Profile'
                      }
                    }
                  ]
                }
              },
              // Main row
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: '40px',
                    marginBottom: '40px',
                  },
                  children: [
                    // Profile Info
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: '1',
                        },
                        children: [
                          // Avatar
                          {
                            type: 'div',
                            props: {
                              style: {
                                position: 'relative',
                                display: 'flex',
                                width: '160px',
                                height: '160px',
                                borderRadius: '40px',
                                border: `3px solid ${userProfile.accentColor || '#6366f1'}`,
                                overflow: 'hidden',
                                marginRight: '36px',
                              },
                              children: avatarBase64
                                ? [
                                    {
                                      type: 'img',
                                      props: {
                                        src: avatarBase64,
                                        style: {
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                        }
                                      }
                                    }
                                  ]
                                : [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '100%',
                                          height: '100%',
                                          backgroundColor: userProfile.accentColor || '#6366f1',
                                          color: '#ffffff',
                                          fontSize: '64px',
                                          fontWeight: 'bold',
                                        },
                                        children: userProfile.displayName.charAt(0).toUpperCase(),
                                      }
                                    }
                                  ]
                            }
                          },
                          // Text info
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                flexDirection: 'column',
                                maxWidth: '480px',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: '42px',
                                      fontWeight: 'bold',
                                      color: '#ffffff',
                                      marginBottom: '6px',
                                    },
                                    children: userProfile.displayName
                                  }
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: '22px',
                                      color: '#9ca3af',
                                      marginBottom: '16px',
                                    },
                                    children: `@${userProfile.username}`
                                  }
                                },
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: '18px',
                                      color: '#d1d5db',
                                      lineHeight: '1.6',
                                    },
                                    children: userProfile.bio 
                                      ? (userProfile.bio.length > 120 ? `${userProfile.bio.substring(0, 117)}...` : userProfile.bio)
                                      : 'Active developer sharing platform cards.'
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    // Right connected platforms
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          width: '380px',
                        },
                        children: [
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: '#9ca3af',
                                marginBottom: '16px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                              },
                              children: 'Connected Platforms'
                            }
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                width: '100%',
                              },
                              children: userProfile.platformLinks.length > 0
                                ? userProfile.platformLinks.slice(0, 6).map((link: any) => {
                                    const platformName = link.platform.charAt(0).toUpperCase() + link.platform.slice(1);
                                    return {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          alignItems: 'center',
                                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                          border: '1px solid rgba(255, 255, 255, 0.1)',
                                          borderRadius: '12px',
                                          padding: '10px 18px',
                                          color: '#ffffff',
                                          fontSize: '18px',
                                          fontWeight: '600',
                                        },
                                        children: [
                                          {
                                            type: 'div',
                                            props: {
                                              style: {
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: userProfile.accentColor || '#6366f1',
                                                marginRight: '10px',
                                              }
                                            }
                                          },
                                          {
                                            type: 'span',
                                            children: platformName
                                          }
                                        ]
                                      }
                                    };
                                  })
                                : [
                                    {
                                      type: 'div',
                                      props: {
                                        style: {
                                          display: 'flex',
                                          color: '#9ca3af',
                                          fontSize: '18px',
                                          fontStyle: 'italic',
                                        },
                                        children: 'No public links added yet.'
                                      }
                                    }
                                  ]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              // Footer
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '24px',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: '18px',
                          color: '#9ca3af',
                        },
                        children: 'Build your developer presence at devcard.dev'
                      }
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: userProfile.accentColor || '#6366f1',
                        },
                        children: `devcard.dev/u/${userProfile.username}`
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: 'Inter',
              data: fonts.regular,
              weight: 400,
              style: 'normal',
            },
            {
              name: 'Inter',
              data: fonts.bold,
              weight: 700,
              style: 'normal',
            }
          ]
        }
      );

      // Render SVG to PNG using resvg-js
      const resvg = new Resvg(svg, {
        background: '#030712',
        fitTo: {
          mode: 'width',
          value: 1200,
        },
      });
      const pngBuffer = resvg.render().asPng();

      // Cache the result in Redis with 1 hour TTL
      if (app.redis && app.redis.status === 'ready') {
        try {
          await app.redis.setex(cacheKey, 3600, pngBuffer);
          app.log.info(`[OG Image] Cached generated preview for @${username}`);
        } catch (err) {
          app.log.error('Redis cache save error:', err as any);
        }
      }

      return reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=3600')
        .send(pngBuffer);

    } catch (err: any) {
      app.log.error('Error generating OG image:', err);
      return reply.status(500).send({ error: 'Failed to generate OG image', details: err?.message || err });
    }
  });
}
