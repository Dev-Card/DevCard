import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function analyticsRoutes(app: FastifyInstance) {
  
  app.get('/overview', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalViews, viewsToday, totalFollows, recentViews] = await Promise.all([
      // Total views of this user's cards/profile
      app.prisma.cardView.count({
        where: { ownerId: userId },
      }),
      // Views today
      app.prisma.cardView.count({
        where: { ownerId: userId, createdAt: { gte: today } },
      }),
      // Follows performed BY this user
      app.prisma.followLog.count({
        where: { followerId: userId, status: 'success' },
      }),
      // Recent views (last 5)
      app.prisma.cardView.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          viewer: {
            select: { displayName: true, avatarUrl: true },
          },
          card: {
            select: { title: true },
          },
        },
      }),
    ]);

    // Count unique viewers
    // In raw SQL this is `SELECT COUNT(DISTINCT viewer_id) FROM card_views WHERE owner_id = ?`
    // Prisma group-by as workaround:
    const uniqueViewersQuery = await app.prisma.cardView.groupBy({
      by: ['viewerId', 'viewerIp'],
      where: { ownerId: userId },
    });
    const uniqueViewers = uniqueViewersQuery.length;

    return {
      totalViews,
      viewsToday,
      totalFollows,
      uniqueViewers,
      recentViews,
    };
  });

  app.get('/views', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { page?: string, cardId?: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const page = parseInt(request.query.page || '1', 10);
    const limit = 20;
    const skip = (page - 1) * limit;
    
    const whereClause: any = { ownerId: userId };
    if (request.query.cardId) {
      whereClause.cardId = request.query.cardId;
    }

    const [total, views] = await Promise.all([
      app.prisma.cardView.count({ where: whereClause }),
      app.prisma.cardView.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          viewer: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          card: {
            select: { id: true, title: true },
          },
        },
      }),
    ]);

    return {
      data: views,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}
