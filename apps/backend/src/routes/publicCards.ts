import type { FastifyInstance } from 'fastify';

/**
 * Public (unauthenticated) routes for DevCard profile sharing.
 * These endpoints are intentionally open — no JWT required.
 * Only safe, non-private fields are returned.
 */
export async function publicCardRoutes(fastify: FastifyInstance) {
  /**
   * GET /public/cards/:username
   *
   * Returns the default card for a given username.
   * Used by the public profile page at /u/:username on the web app.
   *
   * Response shape:
   * {
   *   username: string
   *   displayName: string | null
   *   bio: string | null
   *   avatarUrl: string | null
   *   links: Array<{ platform: string; url: string; label: string | null }>
   * }
   */
  fastify.get<{ Params: { username: string } }>(
    "/public/cards/:username",
    {
      schema: {
        params: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              username: { type: "string" },
              displayName: { type: ["string", "null"] },
              bio: { type: ["string", "null"] },
              avatarUrl: { type: ["string", "null"] },
              links: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    platform: { type: "string" },
                    url: { type: "string" },
                    label: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          404: {
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { username } = request.params;

      // Look up the user by their username (case-insensitive)
      const user = await fastify.prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
        select: {
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          // Fetch the user's default card and its platform links
          cards: {
            where: { isDefault: true },
            take: 1,
            select: {
              cardLinks: {
                select: {
                  platformLink: {
                    select: {
                      platform: true,
                      url: true,
                    },
                  },
                },
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      });

      // 404 if user does not exist
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const defaultCard = user.cards[0];

      return reply.code(200).send({
        username: user.username,
        displayName: user.displayName ?? null,
        bio: user.bio ?? null,
        avatarUrl: user.avatarUrl ?? null,
        links:
          defaultCard?.cardLinks.map((link: { platformLink: { platform: string; url: string } }) => ({
            platform: link.platformLink.platform,
            url: link.platformLink.url,
            label: null,
          })) ?? [],
      });
    }
  );
}
