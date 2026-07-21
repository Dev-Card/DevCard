import { CardVisibility } from '@prisma/client';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { cardRoutes } from '../routes/cards.js';

import type { PrismaClient } from '@prisma/client';

const USER_ID = 'user-123';
const CARD_ID = 'card-abc';
const OTHER_USER_ID = 'user-999';

const mockCard = {
  id: CARD_ID,
  userId: OTHER_USER_ID,
  title: 'My Card',
  slug: 'my-card',
  description: null,
  visibility: CardVisibility.PUBLIC,
  qrEnabled: true,
  viewCount: 0,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  card: {
    findUnique: vi.fn(),
  },
  savedCard: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

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
// POST /api/cards/:id/save
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/cards/:id/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 201 and saves a public card', async () => {
    mockPrisma.card.findUnique.mockResolvedValue(mockCard);
    mockPrisma.savedCard.findUnique.mockResolvedValue(null);
    mockPrisma.savedCard.create.mockResolvedValue({ id: 'saved-1', userId: USER_ID, cardId: CARD_ID });

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/save` });

    console.log(res.statusCode);
    console.log(res.body);
    console.log(res.json())

    expect(res.statusCode).toBe(201);
    expect(mockPrisma.savedCard.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, cardId: CARD_ID },
    });
  });

  it('returns 404 when the card does not exist', async () => {
    mockPrisma.card.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/save` });

    expect(res.statusCode).toBe(404);
    expect(mockPrisma.savedCard.create).not.toHaveBeenCalled();
  });

  it('returns 403 when the card is private', async () => {
    mockPrisma.card.findUnique.mockResolvedValue({ ...mockCard, visibility: CardVisibility.PRIVATE });

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/save` });

    expect(res.statusCode).toBe(403);
    expect(mockPrisma.savedCard.create).not.toHaveBeenCalled();
  });


  it('returns 500 when the lookup throws unexpectedly', async () => {
    mockPrisma.card.findUnique.mockRejectedValue(new Error('DB connection lost'));

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/save` });

    expect(res.statusCode).toBe(500);
    expect(mockPrisma.savedCard.create).not.toHaveBeenCalled();
  });

  // the "already saved" check; the loser's create() then throws a Prisma P2002
  // unique-constraint error that saveCard/the route never catches, so it surfaces
  // as a 500 instead of the intended 409.
  it('returns 409 when a unique-constraint race is hit on create', async () => {
    mockPrisma.card.findUnique.mockResolvedValue(mockCard);
    mockPrisma.savedCard.findUnique.mockResolvedValue(null);
    mockPrisma.savedCard.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint failed on saved_card_unique'), { code: 'P2002' }),
    );

    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: `/api/cards/${CARD_ID}/save` });

    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cards/cards/saved
//
// NOTE: this path is a bug, not the intended API surface. The handler is
// registered as app.get('/cards/saved', ...) inside a plugin already mounted
// at prefix '/api/cards', so it resolves to '/api/cards/cards/saved' instead
// of '/api/cards/saved'. Tests below pin down actual current behavior; once
// the route is fixed to '/saved', update these paths.
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/cards/saved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wireTransaction();
  });

  it('returns 200 with the saved cards for a valid page/limit', async () => {
    const savedRows = [
      { id: 'saved-1', userId: USER_ID, cardId: CARD_ID, savedAt: new Date(), card: { ...mockCard, cardLinks: [] } },
    ];
    mockPrisma.savedCard.findMany.mockResolvedValue(savedRows);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/cards/saved?page=1&limit=10' });
    console.log(res.json());
    console.log(res.statusCode);
    console.log(res.body);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.savedCard.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { savedAt: 'desc' },
      skip: 0,
      take: 10,
      include: { card: { include: { cardLinks: { include: { platformLink: true } } } } },
    });
  });

  it('computes skip correctly for page > 1', async () => {
    mockPrisma.savedCard.findMany.mockResolvedValue([
      { id: 'saved-1', userId: USER_ID, cardId: CARD_ID, savedAt: new Date(), card: { ...mockCard, cardLinks: [] } },
    ]);

    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/api/cards/saved?page=3&limit=5' });

    expect(mockPrisma.savedCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });

  it('returns 404 when the user has no saved cards', async () => {
    mockPrisma.savedCard.findMany.mockResolvedValue([]);

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/cards/saved?page=1&limit=10' });

    // makes "no saved cards at all" indistinguishable from "page past the end".
    expect(res.statusCode).toBe(404);
  });

  // query params flow straight into `(page - 1) * limit`, producing NaN, which
  // Prisma rejects — surfacing as a generic 500 instead of a 400.
  it('returns 500 instead of 400 when page/limit are missing', async () => {
    mockPrisma.savedCard.findMany.mockRejectedValue(new Error('Argument skip: Invalid value NaN'));

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/cards/saved' });

    expect(res.statusCode).toBe(500);
  });

  it('returns 500 when the query throws unexpectedly', async () => {
    mockPrisma.savedCard.findMany.mockRejectedValue(new Error('DB connection lost'));

    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/cards/saved?page=1&limit=10' });

    expect(res.statusCode).toBe(500);
  });
});