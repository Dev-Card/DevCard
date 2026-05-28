import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

type NfcPayloadResponse = {
  type: 'URI';
  payload: string;
};

const nfcQuerySchema = z.object({
  card: z.string().uuid('Invalid card ID format').optional(),
});

export async function nfcRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/nfc/payload — returns NDEF URI payload for user's default DevCard URL
  // GET /api/nfc/payload?card=<cardId> — returns payload for a specific card
  app.get(
    '/payload',
    async (
      request: FastifyRequest<{ Querystring: { card?: string } }>,
      reply: FastifyReply
    ) => {
      const userId = (request.user as any).id;

      // Validate query params with Zod
      const parseResult = nfcQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        });
      }

      const { card: cardId } = parseResult.data;

      let username: string;

      // Fetch username
      try {
        const user = await app.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        if (!user) {
          return reply.status(404).send({
            error: 'User not found',
          });
        }

        username = user.username;
      } catch (err) {
        request.log.error(
          { err },
          'Failed to fetch user for NFC payload'
        );
        return reply.status(500).send({
          error: 'Failed to fetch user profile',
        });
      }

      // If a specific card is requested, verify ownership
      if (cardId) {
        try {
          const card = await app.prisma.card.findUnique({
            where: { id: cardId },
            select: { userId: true },
          });

          if (!card || card.userId !== userId) {
            return reply.status(404).send({
              error: 'Card not found',
            });
          }
        } catch (err) {
          request.log.error(
            { err },
            'Failed to fetch card for NFC payload'
          );
          return reply.status(500).send({
            error: 'Failed to fetch card',
          });
        }
      }

const safeUsername = encodeURIComponent(username);
const payloadUrl = `https://dev-card.vercel.app/${safeUsername}${
  cardId ? `?card=${encodeURIComponent(cardId)}` : ''
}`;
      const response: NfcPayloadResponse = {
        type: 'URI',
        payload: payloadUrl,
      };

      return reply.send(response);
    }
  );
}