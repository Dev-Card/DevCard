import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';

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

// ─── Export Analytics CSV (Optimized) ───
  app.get('/export', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;

    // 1. Set headers early for streaming
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="devcard-analytics.csv"');

    try {
      // 2. DB Aggregation: Let the Database do the heavy lifting
      // Note: Prisma doesn't natively group by Date strings easily, so we use $queryRaw
      // This query groups views by day directly in the DB.
      const aggregatedViews = await app.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT 
          DATE("createdAt") as date, 
          COUNT(*) as count
        FROM "CardView"
        WHERE "ownerId" = ${userId}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `;

      // 3. Node.js Streams: Push data directly to the client without holding it in RAM
      const csvStream = new Readable({
        read() {} // required implementation
      });

      // Push Header
      csvStream.push('date,platform,event_type,count\n');

      // Push Rows
      for (const row of aggregatedViews) {
        // Convert DB Date to YYYY-MM-DD
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        // Note: Prisma returns BigInt for COUNT(*), so we convert it to Number or String
        csvStream.push(`${dateStr},devcard,view,${row.count.toString()}\n`);
      }

      // End the stream
      csvStream.push(null);

      // Fastify automatically handles piping the stream to the response
      return reply.send(csvStream);

    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate CSV export' });
    }
  });
}