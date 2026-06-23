import { CardVisibility } from '@prisma/client';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { cardRoutes } from '../routes/cards.js';

import type { PrismaClient } from '@prisma/client';

const USER_ID = 'user-123';
const CARD_ID = 'card-abc';
// Must be valid UUIDs — the card/link schemas use z.string().uuid()
const OWNED_LINK_ID = '11111111-1111-1111-1111-111111111111';
const FOREIGN_LINK_ID = '22222222-2222-2222-2222-222222222222';

const mockCard = {
  id: CARD_ID,
  userId: USER_ID,
  title: 'My Card',
  slug: 'my-card',
  description: null,
  visibility: CardVisibility.PUBLIC,
  qrEnabled: true,
  viewCount: 0,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  cardLinks: [],
};

// $transaction is used in two shapes by the service/routes:
//   1. interactive:  $transaction(async (tx) => ...)        — runs the callback against the mock client
//   2. sequential:   $transaction([p1, p2])                 — resolves an array of pre-built promises
// The mock supports both so error/rollback paths can be asserted without a real DB.
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
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  platformLink: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  cardView: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Re-wire $transaction before every test so that the interactive form executes the
// callback against the same mock client (preserving per-operation mocks), and the
// sequential array form resolves like Prisma's Promise.all semantics.
function wireTransaction(): void {
  mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return undefined;
  });
}

async function buildApp(): Promise<FastifyInstance> {
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

describe('POST /api/cards — create & link ownership validation', () => {
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
    mockPrisma.card.findUnique.mockResolvedValue(null); // slug is unique
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
    // Creation runs inside the (serializable) transaction
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockPrisma.card.create).toHaveBeenCalled();
  });

  it('returns 400 when linkIds is empty (schema now requires at least one link)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Empty Card', linkIds: [] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Validation failed');
    // Validation fails before any DB work
    expect(mockPrisma.platformLink.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.card.create).not.toHaveBeenCalled();
  });

  it('returns 400 when duplicate linkIds are supplied', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Dupe Card', linkIds: [OWNED_LINK_ID, OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.platformLink.findMany).not.toHaveBeenCalled();
  });

  it('retries and succeeds when the create hits a serialization conflict (P2034)', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.findUnique.mockResolvedValue(null);
    mockPrisma.card.count.mockResolvedValue(0);
    mockPrisma.card.create
      .mockRejectedValueOnce(Object.assign(new Error('serialization failure'), { code: 'P2034' }))
      .mockResolvedValueOnce({ ...mockCard, cardLinks: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/cards',
      payload: { title: 'Test Card', linkIds: [OWNED_LINK_ID] },
    });

    expect(res.statusCode).toBe(201);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
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

  it('returns 500 when card.count throws inside the transaction', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.findUnique.mockResolvedValue(null);
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

  it('returns 500 when card.create throws a non-retryable error', async () => {
    mockPrisma.platformLink.findMany.mockResolvedValue([{ id: OWNED_LINK_ID }]);
    mockPrisma.card.findUnique.mockResolvedValue(null);
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
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/cards/:id/update
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/cards/:id/update — card metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('updates title/description/visibility/qrEnabled for an owned card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.card.update.mockResolvedValue({
      ...mockCard,
      title: 'Renamed',
      visibility: CardVisibility.UNLISTED,
      qrEnabled: false,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/update`,
      payload: { title: 'Renamed', visibility: 'UNLISTED', qrEnabled: false },
    });

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.card.findFirst).toHaveBeenCalledWith({ where: { id: CARD_ID, userId: USER_ID } });
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: CARD_ID },
      data: { title: 'Renamed', description: undefined, visibility: 'UNLISTED', qrEnabled: false },
    });
  });

  it('returns 404 when the card does not belong to the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/update`,
      payload: { title: 'Renamed' },
    });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.card.update).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is empty (schema requires at least one field)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/update`,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Validation failed');
    expect(mockPrisma.card.findFirst).not.toHaveBeenCalled();
  });

  it('returns 500 when card.update throws', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.card.update.mockRejectedValue(new Error('DB write failure'));

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/update`,
      payload: { title: 'Renamed' },
    });

    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/cards/:id/platform-link
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/cards/:id/platform-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 200 when a new owned platform link is added', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.cardLink.findUnique.mockResolvedValue(null); // not already linked
    mockPrisma.platformLink.findFirst.mockResolvedValue({ id: OWNED_LINK_ID, userId: USER_ID });
    mockPrisma.cardLink.create.mockResolvedValue({ id: 'cl-1', cardId: CARD_ID, platformLinkId: OWNED_LINK_ID });

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/platform-link`,
      payload: { platformLinkId: OWNED_LINK_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.cardLink.create).toHaveBeenCalledWith({
      data: { cardId: CARD_ID, platformLinkId: OWNED_LINK_ID },
    });
  });

  it('returns 404 when the card is not owned by the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/platform-link`,
      payload: { platformLinkId: OWNED_LINK_ID },
    });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.cardLink.create).not.toHaveBeenCalled();
  });

  it('returns 403 when the platform link does not belong to the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.cardLink.findUnique.mockResolvedValue(null);
    mockPrisma.platformLink.findFirst.mockResolvedValue(null); // foreign / missing link

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/platform-link`,
      payload: { platformLinkId: FOREIGN_LINK_ID },
    });

    expect(res.statusCode).toBe(403);
    expect(mockPrisma.cardLink.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the platform link is already on the card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.cardLink.findUnique.mockResolvedValue({ id: 'cl-existing' });
    mockPrisma.platformLink.findFirst.mockResolvedValue({ id: OWNED_LINK_ID, userId: USER_ID });

    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/platform-link`,
      payload: { platformLinkId: OWNED_LINK_ID },
    });

    expect(res.statusCode).toBe(409);
    expect(mockPrisma.cardLink.create).not.toHaveBeenCalled();
  });

  it('returns 400 when platformLinkId is not a valid UUID', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/cards/${CARD_ID}/platform-link`,
      payload: { platformLinkId: 'not-a-uuid' },
    });

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.card.findFirst).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/cards/:id/delete
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/cards/:id/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 204 on successful deletion of a non-default card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, isDefault: false });
    mockPrisma.card.count.mockResolvedValue(2);
    mockPrisma.card.delete.mockResolvedValue(mockCard);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}/delete` });

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
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}/delete` });

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
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}/delete` });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.card.delete).not.toHaveBeenCalled();
  });

  it('returns 400 when attempting to delete the last remaining card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);
    mockPrisma.card.count.mockResolvedValue(1);

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}/delete` });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Cannot delete the last remaining card. A user must have at least one card.');
    expect(mockPrisma.card.delete).not.toHaveBeenCalled();
  });

  it('returns 500 when card.delete throws', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, isDefault: false });
    mockPrisma.card.count.mockResolvedValue(2);
    mockPrisma.card.delete.mockRejectedValue(new Error('Deadlock detected'));

    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: `/api/cards/${CARD_ID}/delete` });

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
    expect(res.body).toBe('Default card updated');
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cards/:id/share
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/cards/:id/share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 200 with a share URL for a non-private owned card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/share` });

    expect(res.statusCode).toBe(200);
    expect(res.json().shareUrl).toBe(`/cards/share/${mockCard.slug}`);
  });

  it('returns 404 when the card is not owned by the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/share` });

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when the card is private', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, visibility: CardVisibility.PRIVATE });

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/share` });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cards/share/:slug
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/cards/share/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 200 and records a view for an existing shared card', async () => {
    const sharedCard = { ...mockCard, cardLinks: [] };
    mockPrisma.card.findUnique.mockResolvedValue(sharedCard);
    mockPrisma.card.update.mockResolvedValue(sharedCard);
    mockPrisma.cardView.create.mockResolvedValue({ id: 'view-1' });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/share/${mockCard.slug}` });

    expect(res.statusCode).toBe(200);
    // View tracking runs in the sequential transaction: increment count + log view
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: mockCard.id },
      data: { viewCount: { increment: 1 } },
    });
    expect(mockPrisma.cardView.create).toHaveBeenCalled();
  });

  it('returns 404 when no card matches the slug', async () => {
    mockPrisma.card.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/cards/share/missing-slug' });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.cardView.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cards/:id/qr
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/cards/:id/qr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
    process.env.MOBILE_REDIRECT_URI = 'https://devcard.test';
  });

  it('returns 200 with a PNG image for a shareable, qr-enabled card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(mockCard);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/${CARD_ID}/qr` });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
  });

  it('returns 404 when the card is not owned by the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/${CARD_ID}/qr` });

    expect(res.statusCode).toBe(404);
  });

  it('returns 403 when the card is private', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, visibility: CardVisibility.PRIVATE });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/${CARD_ID}/qr` });

    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when QR is disabled for the card', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, qrEnabled: false });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/${CARD_ID}/qr` });

    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cards/:id/analytics
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/cards/:id/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 200 with the card and its views', async () => {
    mockPrisma.card.findFirst.mockResolvedValue({ ...mockCard, views: [] });

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/${CARD_ID}/analytics` });

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.card.findFirst).toHaveBeenCalled();
  });

  it('returns 404 when the card is not owned by the user', async () => {
    mockPrisma.card.findFirst.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: `/api/cards/${CARD_ID}/analytics` });

    expect(res.statusCode).toBe(404);
  });
});
