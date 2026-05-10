import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function nfcRoutes(app: FastifyInstance) {
  // GET /api/nfc/payload — returns NDEF URI payload for the user's profile or a specific card
  app.get('/payload', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { card?: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const { card: cardId } = request.query;

    // Fetch user to get username for the profile URL
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const appUrl = process.env.PUBLIC_APP_URL || 'https://devcard.dev';

    if (cardId) {
      // Validate card ownership
      const card = await app.prisma.card.findFirst({
        where: { id: cardId, userId },
        select: { id: true },
      });

      if (!card) {
        return reply.status(403).send({ error: 'Card not found or access denied' });
      }

      return {
        type: 'URI',
        payload: `${appUrl}/devcard/${cardId}`,
      };
    }

    // Default: return profile URL
    return {
      type: 'URI',
      payload: `${appUrl}/u/${user.username}`,
    };
  });
}
