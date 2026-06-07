import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { cardRoutes } from '../routes/cards.js';

import type { PrismaClient } from '@prisma/client';

const USER_ID = 'user-123';
const CARD_ID = 'card-abc';
// Must be valid UUIDs — createCardSchema and updateCardSchema use z.string().uuid()
const OWNED_LINK_ID = '11111111-1111-1111-1111-111111111111';
const FOREIGN_LINK_ID = '22222222-2222-2222-2222-222222222222';

const mockCard = {
  id: CARD_ID,
  userId: USER_ID,
  title: 'My Card',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  cardLinks: [],
};

// $transaction executes the callback synchronously against the same mock client,
// mirroring Prisma's interactive-transactions API without a real DB connection.
const mockPrisma = {
  card: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  cardLink: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  platformLink: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Re-wire $transaction before every test so that it executes the callback
// against the same mock client, preserving existing per-operation mocks.
function wireTransaction(): void {
  mockPrisma.$transaction.mockImplementation(
    async (callback: (tx: typeof mockPrisma) => Promise<unknown>, _options?: unknown) => callback(mockPrisma),
  );
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma);
  app.decorate('authenticate', async (request: FastifyRequest & { user?: { id: string } }) => {
async function buildApp():Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate('prisma', mockPrisma as unknown as PrismaClient);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: USER_ID };
  });
  app.register(cardRoutes, { prefix: '/api/cards' });
  await app.ready();
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cards
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/cards — link ownership validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 403 when a supplied linkId belongs to another user', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [FOREIGN_LINK_ID] },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('One or more links do not belong to your account');
    expect(mockPrisma.card.create).not.toHaveBeenCalled();
  });

  it('returns 403 when a mix of owned and foreign linkIds is supplied', async () => {
    // Only 1 of 2 requested IDs is owned — count mismatch triggers 403
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID, FOREIGN_LINK_ID] },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('One or more links do not belong to your account');
    expect(mockPrisma.card.create).not.toHaveBeenCalled();
  });

  it('creates the card when all linkIds are owned by the user', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.count.mockResolvedValue(0);
    mockPrisma.card.create.mockResolvedValue({ ...mockCard, cardLinks: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(201);
    expect(mockPrisma.platformLink.findMany).toHaveBeenCalledWith({
      where: { id: { in: [OWNED_LINK_ID] }, userId: USER_ID },
      select: { id: true },
    });
  });

  it('skips the ownership check and creates the card when linkIds is empty', async () => {
    mockPrisma.card.count.mockResolvedValue(1);
    mockPrisma.card.create.mockResolvedValue({ ...mockCard, isDefault: false, cardLinks: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Empty Card', linkIds: [] },
    });

    expect(res.statusCode).toBe(201);
    expect(mockPrisma.platformLink.findMany).not.toHaveBeenCalled();
  });

  it('returns 500 when the ownership query throws unexpectedly', async () => {
    mockPrisma.platformLink.findMany.mockRejectedValue(new Error('DB connection lost'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(500);
    // No write must have been attempted after the read failure
    expect(mockPrisma.card.create).not.toHaveBeenCalled();
  });

  it('returns 500 when card.count throws and no partial write occurs', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.count.mockRejectedValue(new Error('Query timeout'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(500);
    expect(mockPrisma.card.create).not.toHaveBeenCalled();
  });

  it('returns 500 when card.create throws', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.count.mockResolvedValue(0);
    mockPrisma.card.create.mockRejectedValue(new Error('FK constraint violation'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(500);
  });

  it('wraps creation in a Serializable transaction to prevent race conditions', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.count.mockResolvedValue(0);
    mockPrisma.card.create.mockResolvedValue({ ...mockCard, cardLinks: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(201);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' }
    );
  });

  it('retries the transaction on P2034 serialization failure', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([]);
    
    // First attempt fails with P2034 (serialization conflict)
    // Second attempt succeeds
    const error = new Error('Serialization failure') as Error & { code: string };
    error.code = 'P2034';
    
    // We mock $transaction to fail once, then succeed
    mockPrisma.$transaction
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(
        async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma)
      );

    mockPrisma.card.count.mockResolvedValue(1); // second attempt sees count > 0
    mockPrisma.card.create.mockResolvedValue({ ...mockCard, isDefault: false, cardLinks: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [] },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().isDefault).toBe(false);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/cards/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/cards/:id — link ownership validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 403 when a supplied linkId belongs to another user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.platformLink.findMany.mockResolvedValue([]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}`,
      payload: { linkIds: [FOREIGN_LINK_ID] },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('One or more links do not belong to your account');
    // Existing links must not have been touched
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.cardLink.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.cardLink.createMany).not.toHaveBeenCalled();
  });

  it('updates links atomically when all supplied linkIds are owned', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.cardLink.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.cardLink.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.card.findUnique.mockResolvedValue({ ...mockCard, cardLinks: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}`,
      payload: { linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.platformLink.findMany).toHaveBeenCalledWith({
      where: { id: { in: [OWNED_LINK_ID] }, userId: USER_ID },
      select: { id: true },
    });
    // Both operations must run inside the transaction, not as bare queries
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockPrisma.cardLink.deleteMany).toHaveBeenCalledWith({ where: { cardId: CARD_ID } });
    expect(mockPrisma.cardLink.createMany).toHaveBeenCalled();
  });

  it('returns 404 when the card does not belong to the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}`,
      payload: { linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.platformLink.findMany).not.toHaveBeenCalled();
  });

  it('returns 500 when the ownership query throws and no mutation occurs', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.platformLink.findMany.mockRejectedValue(new Error('DB timeout'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}`,
      payload: { linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(500);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.cardLink.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 500 and preserves existing links when the transaction fails mid-flight', async () => {
    // Ownership check passes; deleteMany succeeds; createMany fails.
    // The transaction rolls back, so the card retains its original links.
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.cardLink.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.cardLink.createMany.mockRejectedValue(new Error('FK constraint'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}`,
      payload: { linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(500);
    // Both were attempted inside the transaction (the DB rolls them back together)
    expect(mockPrisma.cardLink.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.cardLink.createMany).toHaveBeenCalled();
    // The final read must not have been called -- we short-circuited on error
    expect(mockPrisma.card.findUnique).not.toHaveBeenCalled();
  });

  it('returns 500 when card.findFirst throws', async () => {
    mockPrisma.card.findFirst.mockRejectedValue(new Error('Connection refused'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}`,
      payload: { linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/cards/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/cards/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 204 on successful deletion of a non-default card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, isDefault: false });
    mockPrisma.card.count.mockResolvedValue(2);
    mockPrisma.card.delete.mockResolvedValue(mockCard);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}` });

    expect(res.statusCode).toBe(204);
    expect(mockPrisma.card.delete).toHaveBeenCalledWith({ where: { id: CARD_ID } });
    // No reassignment needed for a non-default card
    expect(mockPrisma.card.update).not.toHaveBeenCalled();
  });

  it('returns 204 and reassigns default when deleting the current default card', async () => {
    const otherCard = { id: 'card-other', isDefault: false, userId: USER_ID };
    // First findFirst: card being deleted. Second findFirst: oldest remaining.
    mockPrisma.card.findFirst
      .mockResolvedValueOnce({ ...mockCard, isDefault: true })
      .mockResolvedValueOnce(otherCard);
    mockPrisma.card.count.mockResolvedValue(2);
    mockPrisma.card.update.mockResolvedValue({ ...otherCard, isDefault: true });
    mockPrisma.card.delete.mockResolvedValue(mockCard);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}` });

    expect(res.statusCode).toBe(204);
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: otherCard.id },
      data: { isDefault: true },
    });
    expect(mockPrisma.card.delete).toHaveBeenCalledWith({ where: { id: CARD_ID } });
  });

  it('returns 404 when the card is not owned by the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}` });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.card.delete).not.toHaveBeenCalled();
  });

  it('returns 400 when attempting to delete the last remaining card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.card.count.mockResolvedValue(1);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}` });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Cannot delete the last remaining card. A user must have at least one card.');
    expect(mockPrisma.card.delete).not.toHaveBeenCalled();
  });

  it('returns 500 when card.delete throws', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, isDefault: false });
    mockPrisma.card.count.mockResolvedValue(2);
    mockPrisma.card.delete.mockRejectedValue(new Error('Deadlock detected'));

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}` });

    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/cards/:id/default
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/cards/:id/default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 200 and sets the card as default', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.card.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.card.update.mockResolvedValue({ ...mockCard, isDefault: true });

    const app = await buildApp();
    const res = await app.inject({ method: 'PUT', url: `/api/cards/${CARD_ID}/default` });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe('Default card updated');
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    // Clear-all and set-one must both run inside the transaction
    expect(mockPrisma.card.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { isDefault: false },
    });
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: CARD_ID },
      data: { isDefault: true },
    });
  });

  it('returns 404 when the card is not owned by the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'PUT', url: `/api/cards/${CARD_ID}/default` });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 500 and rolls back when the transaction fails mid-flight', async () => {
    // updateMany clears all defaults; then update fails => transaction aborts,
    // the user retains a consistent default card rather than having none.
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.card.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.card.update.mockRejectedValue(new Error('DB write failure'));

    const app = await buildApp();
    const res = await app.inject({ method: 'PUT', url: `/api/cards/${CARD_ID}/default` });

    expect(res.statusCode).toBe(500);
    expect(mockPrisma.card.updateMany).toHaveBeenCalled();
    expect(mockPrisma.card.update).toHaveBeenCalled();
  });
});
