import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { eventRoutes } from '../routes/event.js';

// ─── Shared mock data ────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-uuid-001';
const MOCK_OTHER_USER_ID = 'user-uuid-002';

const MOCK_EVENT = {
  id: 'event-uuid-001',
  name: 'DevCard Conf 2025',
  slug: 'devcard-conf-2025',
  description: 'Annual DevCard conference',
  location: 'San Francisco, CA',
  organizerId: MOCK_USER_ID,
  startDate: new Date('2025-09-01T09:00:00Z'),
  endDate: new Date('2025-09-02T18:00:00Z'),
  isPublic: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

const MOCK_USER_PROFILE = {
  id: MOCK_USER_ID,
  username: 'johndoe',
  displayName: 'John Doe',
  bio: 'Software engineer',
  pronouns: 'he/him',
  company: 'Acme Corp',
  avatarUrl: 'https://example.com/avatar.png',
  accentColor: '#6366f1',
};

const MOCK_OTHER_USER_PROFILE = {
  id: MOCK_OTHER_USER_ID,
  username: 'janedoe',
  displayName: 'Jane Doe',
  bio: null,
  pronouns: null,
  company: null,
  avatarUrl: null,
  accentColor: '#6366f1',
};

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const prismaMock = {
  event: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  eventAttendee: {
    create: vi.fn(),
    delete: vi.fn(),
  },
};

// ─── App factory ─────────────────────────────────────────────────────────────
//
// Builds a minimal Fastify instance with:
//   • app.prisma      – the Prisma mock
//   • app.authenticate – sets request.user, or returns 401 when mockAuthUserId is null
//
// The authenticate decorator mirrors what the real jwt plugin does so routes
// using `preHandler: [app.authenticate]` work correctly in unit tests.

let mockAuthUserId: string | null = MOCK_USER_ID;

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('prisma', prismaMock as unknown as PrismaClient);

  app.decorate('authenticate', async (request: any, reply: any) => {
    if (mockAuthUserId === null) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    request.user = { id: mockAuthUserId };
  });

  await app.register(eventRoutes, { prefix: '/api/events' });
  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  return { Authorization: 'Bearer mock-token' };
}

async function createEvent(
  app: FastifyInstance,
  body: Record<string, unknown>,
  authenticated = true,
) {
  return app.inject({
    method: 'POST',
    url: '/api/events',
    headers: authenticated ? authHeader() : {},
    payload: body,
  });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('Events API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthUserId = MOCK_USER_ID;
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST /api/events ───────────────────────────────────────────────────────

  describe('POST /api/events — create event', () => {
    const validBody = {
      name: 'DevCard Conf 2025',
      description: 'Annual DevCard conference',
      location: 'San Francisco, CA',
      startDate: '2025-09-01T09:00:00Z',
      endDate: '2025-09-02T18:00:00Z',
      isPublic: true,
    };

    it('201 — creates event and returns it for authenticated organizer', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue(MOCK_EVENT);

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.slug).toBe('devcard-conf-2025');
      expect(body.organizerId).toBe(MOCK_USER_ID);
      expect(body.location).toBe('San Francisco, CA');

      expect(prismaMock.event.create).toHaveBeenCalledOnce();
      const callArg = prismaMock.event.create.mock.calls[0][0].data;
      expect(callArg.name).toBe('DevCard Conf 2025');
      expect(callArg.organizerId).toBe(MOCK_USER_ID);
      expect(callArg.location).toBe('San Francisco, CA');
    });

    it('401 — rejects unauthenticated request', async () => {
      mockAuthUserId = null;

      const res = await createEvent(app, validBody, false);

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Unauthorized' });
    });

    it('400 — rejects missing required fields (no dates, no location)', async () => {
      const res = await createEvent(app, { name: 'Hello World' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects missing location', async () => {
      const { location: _omit, ...bodyWithoutLocation } = validBody;
      const res = await createEvent(app, bodyWithoutLocation);
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects location shorter than 2 characters', async () => {
      const res = await createEvent(app, { ...validBody, location: 'A' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects location longer than 100 characters', async () => {
      const res = await createEvent(app, { ...validBody, location: 'A'.repeat(101) });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects event name shorter than 3 characters', async () => {
      const res = await createEvent(app, { ...validBody, name: 'Hi' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects event name longer than 100 characters', async () => {
      const res = await createEvent(app, { ...validBody, name: 'A'.repeat(101) });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects invalid date format', async () => {
      const res = await createEvent(app, { ...validBody, startDate: 'not-a-date' });
      expect(res.statusCode).toBe(400);
    });

    it('201 — generates a unique slug when the first candidate is taken', async () => {
      prismaMock.event.findUnique
        .mockResolvedValueOnce(MOCK_EVENT) // slug taken on pre-check
        .mockResolvedValueOnce(null);      // randomised slug is free

      prismaMock.event.create.mockResolvedValue({
        ...MOCK_EVENT,
        slug: 'devcard-conf-2025-ab12',
      });

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(201);
      const createdSlug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(createdSlug).toMatch(/^devcard-conf-2025-[a-z0-9]+$/);
    });

    it('201 — isPublic defaults to true when omitted', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue(MOCK_EVENT);

      const { isPublic: _omit, ...bodyWithoutIsPublic } = validBody;
      const res = await createEvent(app, bodyWithoutIsPublic);

      expect(res.statusCode).toBe(201);
      const callData = prismaMock.event.create.mock.calls[0][0].data;
      expect(callData.isPublic).toBe(true);
    });

    it('500 — returns 500 when database write fails with a non-conflict error', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockRejectedValue(new Error('DB error'));

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({ error: 'Failed to create event' });
    });

    // ── P2002 / concurrency tests ────────────────────────────────────────────

    it('201 — retries on P2002 slug conflict and succeeds on the second attempt', async () => {
      // Simulates the TOCTOU window: pre-check passes (findUnique returns null),
      // but the insert fails with P2002 because a concurrent request won the race.
      // The second attempt succeeds.
      prismaMock.event.findUnique.mockResolvedValue(null);

      const conflictError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['slug'] },
      });

      prismaMock.event.create
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({ ...MOCK_EVENT, slug: 'devcard-conf-2025-retry' });

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(201);
      // create called twice: first attempt (conflict) + one retry (success)
      expect(prismaMock.event.create).toHaveBeenCalledTimes(2);
    });

    it('201 — succeeds after multiple consecutive P2002 conflicts', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const conflictError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });

      prismaMock.event.create
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError)
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({ ...MOCK_EVENT, slug: 'devcard-conf-2025-ok' });

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(201);
      expect(prismaMock.event.create).toHaveBeenCalledTimes(4);
    });

    it('500 — returns 500 after exhausting all retry attempts on persistent P2002', async () => {
      // If every attempt collides, the retry budget must be finite and exhaust
      // to a deterministic 500, never loop forever.
      prismaMock.event.findUnique.mockResolvedValue(null);

      const conflictError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
      prismaMock.event.create.mockRejectedValue(conflictError);

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({ error: 'Failed to create event' });

      // Retries must be bounded
      const callCount = prismaMock.event.create.mock.calls.length;
      expect(callCount).toBeGreaterThan(1);    // at least one retry occurred
      expect(callCount).toBeLessThanOrEqual(5); // never exceeds MAX_CREATE_ATTEMPTS
    });

    it('500 — does not retry on non-P2002 database errors', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockRejectedValue(new Error('Connection lost'));

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(500);
      // Non-conflict errors must not trigger retries
      expect(prismaMock.event.create).toHaveBeenCalledTimes(1);
    });

    it('concurrent same-name requests: P2002 is never surfaced as an unhandled 500', async () => {
      // Simulate two concurrent requests where alternating inserts fail with P2002.
      // Both must resolve without surfacing a raw database error to the caller.
      prismaMock.event.findUnique.mockResolvedValue(null);

      const conflictError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });

      let callCount = 0;
      prismaMock.event.create.mockImplementation(async (args: any) => {
        callCount++;
        if (callCount % 2 === 1) throw conflictError; // odd calls fail
        return { ...MOCK_EVENT, slug: args.data.slug };
      });

      const [resA, resB] = await Promise.all([
        createEvent(app, validBody),
        createEvent(app, validBody),
      ]);

      const statuses = [resA.statusCode, resB.statusCode];
      // Both must resolve to 201 or a deterministic 500 — never a raw P2002
      expect(statuses.every((s) => s === 201 || s === 500)).toBe(true);
      // At least one request must succeed
      expect(statuses).toContain(201);
    });
  });

  // ── GET /api/events/:slug ──────────────────────────────────────────────────

  describe('GET /api/events/:slug — event details', () => {
    it('200 — returns event info with attendee count', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 42 },
        organizer: {
          username: MOCK_USER_PROFILE.username,
          displayName: MOCK_USER_PROFILE.displayName,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.slug).toBe('devcard-conf-2025');
      expect(body.attendeesCount).toBe(42);
      expect(body.location).toBe('San Francisco, CA');
      expect(body.organizerUsername).toBe(MOCK_USER_PROFILE.username);
      expect(body.organizerDisplayName).toBe(MOCK_USER_PROFILE.displayName);
      expect(body.organizerId).toBeUndefined();
    });

    it('404 — returns 404 for unknown slug', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/ghost-event',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'Event not found' });
    });

    it('200 — works without authentication (public endpoint)', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
        organizer: {
          username: MOCK_USER_PROFILE.username,
          displayName: MOCK_USER_PROFILE.displayName,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
        // No Authorization header
      });

      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /api/events/:slug/join ────────────────────────────────────────────

  describe('POST /api/events/:slug/join — join event', () => {
    it('201 — authenticated user joins an existing event', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      prismaMock.eventAttendee.create.mockResolvedValue({
        id: 'attendee-uuid-001',
        userId: MOCK_OTHER_USER_ID,
        eventId: MOCK_EVENT.id,
        joinedAt: new Date(),
      });

      mockAuthUserId = MOCK_OTHER_USER_ID;

      const res = await app.inject({
        method: 'POST',
        url: '/api/events/devcard-conf-2025/join',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ message: 'User joined successfully' });

      const callData = prismaMock.eventAttendee.create.mock.calls[0][0].data;
      expect(callData.eventId).toBe(MOCK_EVENT.id);
      expect(callData.userId).toBe(MOCK_OTHER_USER_ID);
    });

    it('401 — rejects unauthenticated request', async () => {
      mockAuthUserId = null;

      const res = await app.inject({
        method: 'POST',
        url: '/api/events/devcard-conf-2025/join',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Unauthorized' });
    });

    it('404 — returns 404 when event does not exist', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/events/ghost-event/join',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'Event not found' });
    });

    it('409 — returns 409 when user already joined the event', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      const uniqueError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      prismaMock.eventAttendee.create.mockRejectedValue(uniqueError);

      const res = await app.inject({
        method: 'POST',
        url: '/api/events/devcard-conf-2025/join',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ error: 'Already joined' });
    });

    it('500 — returns 500 on unexpected database error', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      prismaMock.eventAttendee.create.mockRejectedValue(new Error('DB error'));

      const res = await app.inject({
        method: 'POST',
        url: '/api/events/devcard-conf-2025/join',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({ error: 'Failed to join' });
    });
  });

  // ── DELETE /api/events/:slug/leave ────────────────────────────────────────

  describe('DELETE /api/events/:slug/leave — leave event', () => {
    it('204 — authenticated user leaves an event they joined', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      prismaMock.eventAttendee.delete.mockResolvedValue({});

      mockAuthUserId = MOCK_OTHER_USER_ID;

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/devcard-conf-2025/leave',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(204);

      const deleteArg = prismaMock.eventAttendee.delete.mock.calls[0][0].where;
      expect(deleteArg).toMatchObject({
        userId_eventId: {
          userId: MOCK_OTHER_USER_ID,
          eventId: MOCK_EVENT.id,
        },
      });
    });

    it('401 — rejects unauthenticated request', async () => {
      mockAuthUserId = null;

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/devcard-conf-2025/leave',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Unauthorized' });
    });

    it('404 — returns 404 when event does not exist', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/ghost-event/leave',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'Event not found' });
    });

    it('404 — returns 404 when user was never an attendee (P2025)', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      const notFoundError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      prismaMock.eventAttendee.delete.mockRejectedValue(notFoundError);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/devcard-conf-2025/leave',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'User not found' });
    });

    it('500 — returns 500 on unexpected database error', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      prismaMock.eventAttendee.delete.mockRejectedValue(new Error('DB error'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/devcard-conf-2025/leave',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({ error: 'Failed to leave' });
    });
  });

  // ── GET /api/events/:slug/attendees ───────────────────────────────────────

  describe('GET /api/events/:slug/attendees — paginated attendee list', () => {
    function makeAttendeeRow(
      profile: typeof MOCK_USER_PROFILE | typeof MOCK_OTHER_USER_PROFILE,
    ) {
      return {
        id: `attendee-${profile.id}`,
        userId: profile.id,
        eventId: MOCK_EVENT.id,
        joinedAt: new Date(),
        user: { ...profile },
      };
    }

    it('200 — returns paginated attendees with default page/limit', async () => {
      const attendeeRows = [
        makeAttendeeRow(MOCK_USER_PROFILE),
        makeAttendeeRow(MOCK_OTHER_USER_PROFILE),
      ];

      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 2 },
        attendees: attendeeRows,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      expect(body.attendees).toHaveLength(2);
      expect(body.attendees[0]).toMatchObject({
        id: MOCK_USER_ID,
        username: 'johndoe',
        displayName: 'John Doe',
      });

      expect(body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
      });
    });

    it('200 — respects custom page and limit query params', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 1 },
        attendees: [makeAttendeeRow(MOCK_OTHER_USER_PROFILE)],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?page=2&limit=5',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(5);

      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.skip).toBe(5);
      expect(includeArg.attendees.take).toBe(5);
    });

    it('200 — caps limit at 50 even if higher value is requested', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
        attendees: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?limit=200',
      });

      expect(res.statusCode).toBe(200);
      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.take).toBe(50);
    });

    it('200 — treats page < 1 as page 1', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
        attendees: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?page=0',
      });

      expect(res.statusCode).toBe(200);
      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.skip).toBe(0);
    });

    it('200 — returns empty attendees list for event with no attendees', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
        attendees: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.attendees).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
    });

    it('200 — public profiles do not leak sensitive fields', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 1 },
        attendees: [makeAttendeeRow(MOCK_USER_PROFILE)],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      expect(res.statusCode).toBe(200);
      const attendee = res.json().attendees[0];

      expect(attendee).toHaveProperty('id');
      expect(attendee).toHaveProperty('username');
      expect(attendee).toHaveProperty('displayName');
      expect(attendee).toHaveProperty('accentColor');

      expect(attendee).not.toHaveProperty('email');
      expect(attendee).not.toHaveProperty('provider');
      expect(attendee).not.toHaveProperty('providerId');
      expect(attendee).not.toHaveProperty('role');
    });

    it('404 — returns 404 for unknown event slug', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/ghost-event/attendees',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'Event not found' });
    });

    it('200 — attendees are ordered by joinedAt desc (latest first)', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
        attendees: [],
      });

      await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.orderBy).toMatchObject({ joinedAt: 'desc' });
    });
  });

  // ── Slug generation ───────────────────────────────────────────────────────

  describe('Slug generation', () => {
    const baseBody = {
      location: 'San Francisco, CA',
      startDate: '2025-09-01T09:00:00Z',
      endDate: '2025-09-02T18:00:00Z',
    };

    it('converts spaces and special characters to hyphens', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue({ ...MOCK_EVENT, slug: 'my-awesome-event' });

      await createEvent(app, { ...baseBody, name: 'My Awesome Event!!!' });

      expect(prismaMock.event.create).toHaveBeenCalledOnce();
      const slug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(slug).toBe('my-awesome-event');
    });

    it('strips leading and trailing hyphens from slug', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue({ ...MOCK_EVENT, slug: 'event-name' });

      await createEvent(app, { ...baseBody, name: '---Event Name---' });

      expect(prismaMock.event.create).toHaveBeenCalledOnce();
      const slug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(slug).not.toMatch(/^-|-$/);
    });

    it('collapses multiple consecutive hyphens into one', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue({ ...MOCK_EVENT, slug: 'event-name' });

      await createEvent(app, { ...baseBody, name: 'Event   Name' });

      expect(prismaMock.event.create).toHaveBeenCalledOnce();
      const slug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(slug).not.toMatch(/--/);
    });

    it('regression: P2002 on insert triggers retry with a different slug, not a 500', async () => {
      // Reproduces the original race condition:
      //   1. Both requests call findUnique — base slug appears free (TOCTOU window).
      //   2. The losing request's insert returns P2002.
      //   3. On the retry, findUnique now shows the slug as taken (the winner committed it).
      //   4. generateUniqueSlug produces a suffix-appended slug.
      //   5. The retry insert succeeds — caller receives 201, not 500.
      prismaMock.event.findUnique
        .mockResolvedValueOnce(null)       // attempt 1: slug appears free (TOCTOU)
        .mockResolvedValueOnce(MOCK_EVENT) // retry pre-check: slug now taken in DB
        .mockResolvedValueOnce(null);      // retry: suffix slug is free

      const conflictError = Object.assign(new Error('Unique constraint failed on slug'), {
        code: 'P2002',
      });

      let callCount = 0;
      prismaMock.event.create.mockImplementation(async (args: any) => {
        callCount++;
        if (callCount === 1) throw conflictError;
        return { ...MOCK_EVENT, slug: args.data.slug };
      });

      const res = await createEvent(app, { ...baseBody, name: 'DevCard Conf 2025' });

      expect(res.statusCode).toBe(201);
      expect(prismaMock.event.create).toHaveBeenCalledTimes(2);

      // The slug on the retry must differ from the first attempt because the
      // retry's pre-check now sees the base slug as taken and appends a suffix.
      const firstSlug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      const secondSlug: string = prismaMock.event.create.mock.calls[1][0].data.slug;
      expect(secondSlug).not.toBe(firstSlug);
      expect(secondSlug).toMatch(/^devcard-conf-2025-[a-z0-9]+$/);
    });
  });
});
