import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const nfcQuerySchema = z.object({
  card: z.string().uuid('Invalid card ID format').optional(),
});

export async function nfcRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/nfc/payload — returns NDEF URI payload for user's default DevCard URL
  // GET /api/nfc/payload?card=<cardId> — returns payload for a specific card
  app.get('/payload', async (request: FastifyRequest<{ Querystring: { card?: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    // Validate query params with Zod
    const parseResult = nfcQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
    }

    const { card: cardId } = parseResult.data;

    let username: string;

    try {
      // Get username from user profile
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      username = user.username;
    } catch (err) {
      request.log.error({ err }, 'Failed to fetch user for NFC payload');
      return reply.status(500).send({ error: 'Failed to fetch user profile' });
    }

    if (cardId) {
      try {
        // Validate card belongs to authenticated user
        const card = await app.prisma.card.findUnique({
          where: { id: cardId },
          select: { userId: true },
        });

        if (!card) {
          return reply.status(404).send({ error: 'Card not found' });
        }

        if (card.userId !== userId) {
          return reply.status(403).send({ error: 'This card does not belong to you' });
        }
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch card for NFC payload');
        return reply.status(500).send({ error: 'Failed to fetch card details' });
      }

      return reply.send({
        type: 'URI',
        payload: `https://devcard.dev/${username}?card=${cardId}`,
      });
    }

    return reply.send({
      type: 'URI',
      payload: `https://devcard.dev/${username}`,
    });
  });
}