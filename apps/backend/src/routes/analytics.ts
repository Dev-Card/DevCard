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

  app.get('/export', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { userId?: string } }>, reply: FastifyReply) => {
    const requestingUserId = (request.user as any).id;

    // IDOR guard: if a userId query param is supplied and differs from the caller, reject.
    if (request.query.userId && request.query.userId !== requestingUserId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const userId = requestingUserId;

    // Fetch card views grouped by date and source (used as "platform" for card views)
    const cardViewGroups = await app.prisma.cardView.groupBy({
      by: ['createdAt', 'source'],
      where: { ownerId: userId },
      _count: { id: true },
    });

    // Fetch follow logs grouped by date and platform
    const followGroups = await app.prisma.followLog.groupBy({
      by: ['createdAt', 'platform'],
      where: { followerId: userId, status: 'success' },
      _count: { id: true },
    });

    // Aggregate rows by date string + platform + event_type
    const aggregated: Record<string, { date: string; platform: string; event_type: string; count: number }> = {};

    for (const row of cardViewGroups) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const key = `${date}|${row.source}|card_view`;
      if (!aggregated[key]) {
        aggregated[key] = { date, platform: row.source, event_type: 'card_view', count: 0 };
      }
      aggregated[key].count += row._count.id;
    }

    for (const row of followGroups) {
      const date = row.createdAt.toISOString().slice(0, 10);
      const key = `${date}|${row.platform}|follow`;
      if (!aggregated[key]) {
        aggregated[key] = { date, platform: row.platform, event_type: 'follow', count: 0 };
      }
      aggregated[key].count += row._count.id;
    }

    const rows = Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));

    const csvLines = ['date,platform,event_type,count'];
    for (const r of rows) {
      csvLines.push(`${r.date},${r.platform},${r.event_type},${r.count}`);
    }
    const csv = csvLines.join('\n');

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename=devcard-analytics.csv')
      .send(csv);
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
