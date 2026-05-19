import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function nfcRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // GET /api/nfc/payload — returns NDEF URI payload for user's default DevCard URL
  // GET /api/nfc/payload?card=<cardId> — returns payload for a specific card
  app.get('/payload', async (request: FastifyRequest<{ Querystring: { card?: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { card: cardId } = request.query;

    let username: string;

    // Get username from user profile
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    username = user.username;

    if (cardId) {
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