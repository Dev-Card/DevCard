import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { cardRoutes } from '../routes/cards.js';
import type { PrismaClient } from '@prisma/client';

const mockPrisma = {
  card: {
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  cardLink: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  }
} as unknown as PrismaClient;

async function buildApp() {
  const app = Fastify();
  app.decorate('prisma', mockPrisma);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-123' };
  });
  app.register(cardRoutes, { prefix: '/api/cards' });
  await app.ready();
  return app;
}

describe('DELETE /api/cards/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 404 if card is not found', async () => {
    (mockPrisma.card.findFirst as any).mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/cards/card-1' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Card not found');
  });

  it('should return 400 if trying to delete the last remaining card', async () => {
    (mockPrisma.card.findFirst as any).mockResolvedValue({ id: 'card-1', isDefault: true, userId: 'user-123' });
    (mockPrisma.card.count as any).mockResolvedValue(1);
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/cards/card-1' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Cannot delete the last remaining card. A user must have at least one card.');
  });

  it('should successfully delete a non-default card without reassigning', async () => {
    (mockPrisma.card.findFirst as any).mockResolvedValue({ id: 'card-1', isDefault: false, userId: 'user-123' });
    (mockPrisma.card.count as any).mockResolvedValue(2);
    (mockPrisma.card.delete as any).mockResolvedValue({ id: 'card-1' });
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/cards/card-1' });
    expect(res.statusCode).toBe(204);
    expect(mockPrisma.card.update).not.toHaveBeenCalled();
    expect(mockPrisma.card.delete).toHaveBeenCalledWith({ where: { id: 'card-1' } });
  });

  it('should reassign default to oldest remaining card if deleting the default card', async () => {
    (mockPrisma.card.findFirst as any)
      .mockResolvedValueOnce({ id: 'card-1', isDefault: true, userId: 'user-123' }) // first findFirst for existing
      .mockResolvedValueOnce({ id: 'card-2', isDefault: false, userId: 'user-123' }); // second findFirst for oldest remaining

    (mockPrisma.card.count as any).mockResolvedValue(2);
    (mockPrisma.card.update as any).mockResolvedValue({ id: 'card-2', isDefault: true });
    (mockPrisma.card.delete as any).mockResolvedValue({ id: 'card-1' });
    
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/cards/card-1' });
    
    expect(res.statusCode).toBe(204);
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: 'card-2' },
      data: { isDefault: true },
    });
    expect(mockPrisma.card.delete).toHaveBeenCalledWith({ where: { id: 'card-1' } });
  });
});
