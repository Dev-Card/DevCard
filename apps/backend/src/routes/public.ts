import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { generateQRBuffer, generateQRSvg } from '../utils/qr.js';

export async function publicRoutes(app: FastifyInstance) {
  // ─── Public Profile ───

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

    return {
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
    };
  });

  // ─── Public Card View ───

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

    return {
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
