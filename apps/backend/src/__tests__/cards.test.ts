import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { cardRoutes } from '../routes/cards.js';
import type { PrismaClient } from '@prisma/client';

const PLATFORM_LINK_UUID = '4b045e99-b1d6-4a11-b0db-5507cc36cc0d';
const NEW_LINK_UUID = 'c13c7a10-2b1d-4000-8000-123456789abc';

const mockCard = {
  id: 'card-123',
  title: 'My Professional Card',
  isDefault: true,
  userId: 'user-123',
  cardLinks: [
    {
      cardId: 'card-123',
      platformLinkId: PLATFORM_LINK_UUID,
      displayOrder: 0,
      platformLink: {
        id: PLATFORM_LINK_UUID,
        platform: 'github',
        url: 'https://github.com/testuser',
      },
    },
  ],
};

const mockPrisma = {
  card: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
  },
  cardLink: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(async (callback) => {
    return await callback(mockPrisma);
  }),
};

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-123' };
  });
  app.register(cardRoutes, { prefix: '/api/cards' });
  await app.ready();
  return app;
}

describe('Card Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/cards', () => {
    it('should return user cards with links', async () => {
      mockPrisma.card.findMany.mockResolvedValue([mockCard]);
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/cards',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('My Professional Card');
      expect(body[0].links[0].platform).toBe('github');
    });
  });

  describe('POST /api/cards', () => {
    it('should create card successfully', async () => {
      mockPrisma.card.count.mockResolvedValue(0);
      mockPrisma.card.create.mockResolvedValue(mockCard);
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/cards',
        payload: {
          title: 'My Professional Card',
          linkIds: [PLATFORM_LINK_UUID],
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().title).toBe('My Professional Card');
    });
  });

  describe('PUT /api/cards/:id', () => {
    it('should update card links and title atomically', async () => {
      mockPrisma.card.findFirst.mockResolvedValue(mockCard);
      mockPrisma.card.update.mockResolvedValue({ ...mockCard, title: 'Updated Title' });
      mockPrisma.cardLink.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cardLink.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.card.findUnique.mockResolvedValue({
        ...mockCard,
        title: 'Updated Title',
      });

      const app = await buildApp();
      const res = await app.inject({
        method: 'PUT',
        url: '/api/cards/card-123',
        payload: {
          title: 'Updated Title',
          linkIds: [NEW_LINK_UUID],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.card.update).toHaveBeenCalled();
      expect(mockPrisma.cardLink.deleteMany).toHaveBeenCalledWith({ where: { cardId: 'card-123' } });
      expect(mockPrisma.cardLink.createMany).toHaveBeenCalled();
    });

    it('should fail and propagate error if card link creation fails', async () => {
      mockPrisma.card.findFirst.mockResolvedValue(mockCard);
      mockPrisma.card.update.mockResolvedValue({ ...mockCard, title: 'Updated Title' });
      mockPrisma.cardLink.deleteMany.mockResolvedValue({ count: 1 });
      
      // Simulate database error during link insertion
      const dbError = new Error('Foreign key constraint violation');
      mockPrisma.cardLink.createMany.mockRejectedValue(dbError);

      const app = await buildApp();
      const res = await app.inject({
        method: 'PUT',
        url: '/api/cards/card-123',
        payload: {
          title: 'Updated Title',
          linkIds: [NEW_LINK_UUID],
        },
      });

      // The route handler should throw the error which vitest inject catches as 500
      expect(res.statusCode).toBe(500);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.cardLink.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.cardLink.createMany).toHaveBeenCalled();
    });
  });
});
