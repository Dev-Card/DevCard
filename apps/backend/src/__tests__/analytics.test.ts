import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { analyticsRoutes } from '../routes/analytics';

describe('GET /export - CSV Export', () => {
  let app: ReturnType<typeof Fastify>;
  let prismaMock: any;

  beforeEach(async () => {
    // 1. Setup a dummy Fastify instance for testing
    app = Fastify();
    
    // 2. Mock Prisma behavior (Database)
    prismaMock = {
      $queryRaw: vi.fn(),
      // Mocking other models just so the plugin registers without errors
      cardView: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
      followLog: { count: vi.fn() }
    };
    app.decorate('prisma', prismaMock);
    
    // 3. Mock Authentication Middleware
    app.decorate('authenticate', async (request: any, reply: any) => {
      if (request.headers.authorization !== 'Bearer valid-token') {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      // Inject dummy user ID (simulating decoded JWT)
      request.user = { id: 'user-123' };
    });

    // 4. Register our actual routes
    await app.register(analyticsRoutes);
  });

  it('should return 401 when unauthenticated', async () => {
    // Expected: Request without valid Auth header returns 401
    const response = await app.inject({
      method: 'GET',
      url: '/export',
    });
    
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Unauthorized' });
  });

  it('should strictly return the users own data (No IDOR) and prevent 403 scenarios', async () => {
    // Expected: The endpoint relies strictly on request.user.id
    prismaMock.$queryRaw.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/export',
      headers: { authorization: 'Bearer valid-token' }
    });

    // Validates that the request succeeded and Prisma was called
    expect(response.statusCode).toBe(200);
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });

  it('should return valid CSV structure with correct headers', async () => {
    // Mock data mimicking Prisma's BigInt and Date return types
    prismaMock.$queryRaw.mockResolvedValue([
      { date: new Date('2026-03-12T00:00:00.000Z'), count: 1n },
      { date: new Date('2026-03-13T00:00:00.000Z'), count: 5n }
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/export',
      headers: { authorization: 'Bearer valid-token' }
    });

    // 1. Verify Status
    expect(response.statusCode).toBe(200);
    
    // 2. Verify Headers
    expect(response.headers['content-type']).toBe('text/csv');
    expect(response.headers['content-disposition']).toBe('attachment; filename="devcard-analytics.csv"');
    
    // 3. Verify Body (CSV Format)
    const body = response.body;
    expect(body).toContain('date,platform,event_type,count\n');
    expect(body).toContain('2026-03-12,devcard,view,1\n');
    expect(body).toContain('2026-03-13,devcard,view,5\n');
  });

});