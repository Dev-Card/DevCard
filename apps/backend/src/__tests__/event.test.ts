import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { eventRoutes } from '../routes/event.js';

// ── Shared mock data ──────────────────────────────────────────────────────────

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

// Private variant — same shape, visibility flag flipped.
const MOCK_PRIVATE_EVENT = {
  ...MOCK_EVENT,
  isPublic: false,
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

// ── Prisma mock ───────────────────────────────────────────────────────────────

const prismaMock = {
  event: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  eventAttendee: {
    create: vi.fn(),
    delete: vi.fn(),
    // Used by canAccessEvent to check private-event membership.
    findUnique: vi.fn(),
  },
};

// ── App factory ───────────────────────────────────────────────────────────────
//
// Builds a minimal Fastify instance wired with:
//   • app.prisma  — the Prisma mock above
//   • request.jwtVerify() — overridden per-test via `mockJwtVerify`
//
// Routes are registered under /api/events to match the production prefix.

let mockJwtVerify = vi.fn();

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('prisma', prismaMock as unknown as PrismaClient);

  app.decorateRequest('jwtVerify', function () {
    return mockJwtVerify();
  });

  await app.register(eventRoutes, { prefix: '/api/events' });
  await app.ready();
  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Builds a raw EventAttendee row as Prisma returns it (with nested user). */
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

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Events API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJwtVerify.mockResolvedValue({ id: MOCK_USER_ID });
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
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

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
        .mockResolvedValueOnce(MOCK_EVENT)
        .mockResolvedValueOnce(null);

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

    it('500 — returns 500 when database write fails', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockRejectedValue(new Error('DB error'));

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({ error: 'Failed to create event' });
    });
  });

  // ── GET /api/events/:slug ──────────────────────────────────────────────────

  describe('GET /api/events/:slug — event details', () => {
    // ── Public event behavior (unchanged) ────────────────────────────────────

    it('200 — returns event info with attendee count', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 42 },
      });

      const res = await app.inject({ method: 'GET', url: '/api/events/devcard-conf-2025' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.slug).toBe('devcard-conf-2025');
      expect(body.attendeesCount).toBe(42);
      expect(body.location).toBe('San Francisco, CA');
      expect(body.organizerId).toBe(MOCK_USER_ID);
    });

    it('404 — returns 404 for unknown slug', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/events/ghost-event' });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'Event not found' });
    });

    it('200 — public event is accessible without authentication', async () => {
      // jwtVerify must NOT be called for a public event with no auth header.
      mockJwtVerify.mockRejectedValue(new Error('Should not be called'));
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
      });

      const res = await app.inject({ method: 'GET', url: '/api/events/devcard-conf-2025' });

      expect(res.statusCode).toBe(200);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    // ── Private event visibility ──────────────────────────────────────────────

    it('401 — unauthenticated caller cannot view a private event', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        _count: { attendees: 5 },
      });

      // No Authorization header — request is unauthenticated.
      const res = await app.inject({ method: 'GET', url: '/api/events/devcard-conf-2025' });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Authentication required to view this event',
      });
    });

    it('200 — organizer can view their own private event', async () => {
      // MOCK_USER_ID is the organizer.
      mockJwtVerify.mockResolvedValue({ id: MOCK_USER_ID });
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        _count: { attendees: 3 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().slug).toBe('devcard-conf-2025');
      // Organizer access never needs an attendee lookup.
      expect(prismaMock.eventAttendee.findUnique).not.toHaveBeenCalled();
    });

    it('200 — confirmed attendee can view a private event they joined', async () => {
      // MOCK_OTHER_USER_ID is not the organizer but is an attendee.
      mockJwtVerify.mockResolvedValue({ id: MOCK_OTHER_USER_ID });
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        _count: { attendees: 3 },
      });
      prismaMock.eventAttendee.findUnique.mockResolvedValue({
        userId: MOCK_OTHER_USER_ID,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().slug).toBe('devcard-conf-2025');
    });

    it('403 — authenticated user who is not a member cannot view a private event', async () => {
      mockJwtVerify.mockResolvedValue({ id: 'stranger-user-id' });
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        _count: { attendees: 3 },
      });
      // Attendee lookup finds no record for this user.
      prismaMock.eventAttendee.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        error: 'You do not have access to this event',
      });
    });

    it('does not expose isPublic in the event details response', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        _count: { attendees: 0 },
      });

      const res = await app.inject({ method: 'GET', url: '/api/events/devcard-conf-2025' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).not.toHaveProperty('isPublic');
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

      mockJwtVerify.mockResolvedValue({ id: MOCK_OTHER_USER_ID });

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
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

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

    it('409 — returns 409 when user has already joined', async () => {
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
    it('204 — authenticated user successfully leaves an event', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      prismaMock.eventAttendee.delete.mockResolvedValue({});

      mockJwtVerify.mockResolvedValue({ id: MOCK_OTHER_USER_ID });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/devcard-conf-2025/leave',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(204);

      const deleteArg = prismaMock.eventAttendee.delete.mock.calls[0][0].where;
      expect(deleteArg).toMatchObject({
        userId_eventId: { userId: MOCK_OTHER_USER_ID, eventId: MOCK_EVENT.id },
      });
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

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
    // ── Public event behavior (unchanged) ────────────────────────────────────

    it('200 — returns paginated attendees with default page/limit', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        attendees: [
          makeAttendeeRow(MOCK_USER_PROFILE),
          makeAttendeeRow(MOCK_OTHER_USER_PROFILE),
        ],
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
      expect(body.pagination).toMatchObject({ page: 1, limit: 10, total: 2 });
    });

    it('200 — respects custom page and limit query params', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
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

    it('200 — caps limit at 50 even if a higher value is requested', async () => {
      prismaMock.event.findUnique.mockResolvedValue({ ...MOCK_EVENT, attendees: [] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?limit=200',
      });

      expect(res.statusCode).toBe(200);
      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.take).toBe(50);
    });

    it('200 — treats page < 1 as page 1', async () => {
      prismaMock.event.findUnique.mockResolvedValue({ ...MOCK_EVENT, attendees: [] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?page=0',
      });

      expect(res.statusCode).toBe(200);
      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.skip).toBe(0);
    });

    it('200 — returns empty attendees list for event with no attendees', async () => {
      prismaMock.event.findUnique.mockResolvedValue({ ...MOCK_EVENT, attendees: [] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.attendees).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
    });

    it('200 — attendee profiles do not expose sensitive fields', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        attendees: [makeAttendeeRow(MOCK_USER_PROFILE)],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

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
      prismaMock.event.findUnique.mockResolvedValue({ ...MOCK_EVENT, attendees: [] });

      await app.inject({ method: 'GET', url: '/api/events/devcard-conf-2025/attendees' });

      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.orderBy).toMatchObject({ joinedAt: 'desc' });
    });

    // ── Private event attendee visibility ─────────────────────────────────────

    it('401 — unauthenticated caller cannot enumerate private event attendees', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        attendees: [makeAttendeeRow(MOCK_USER_PROFILE)],
      });

      // No Authorization header.
      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        error: 'Authentication required to view this event',
      });
    });

    it('200 — organizer can retrieve attendee list of their private event', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_USER_ID }); // organizer
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        attendees: [makeAttendeeRow(MOCK_OTHER_USER_PROFILE)],
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().attendees).toHaveLength(1);
      // Organizer access never triggers an attendee membership lookup.
      expect(prismaMock.eventAttendee.findUnique).not.toHaveBeenCalled();
    });

    it('200 — confirmed attendee can retrieve the attendee list of a private event', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_OTHER_USER_ID }); // attendee, not organizer
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        attendees: [
          makeAttendeeRow(MOCK_USER_PROFILE),
          makeAttendeeRow(MOCK_OTHER_USER_PROFILE),
        ],
      });
      prismaMock.eventAttendee.findUnique.mockResolvedValue({
        userId: MOCK_OTHER_USER_ID,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().attendees).toHaveLength(2);
    });

    it('403 — authenticated user not in attendee list cannot access private event attendees', async () => {
      mockJwtVerify.mockResolvedValue({ id: 'stranger-user-id' });
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_PRIVATE_EVENT,
        attendees: [makeAttendeeRow(MOCK_USER_PROFILE)],
      });
      prismaMock.eventAttendee.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({
        error: 'You do not have access to this event',
      });
    });

    it('200 — public event attendee list remains accessible without authentication', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Should not be called'));
      prismaMock.event.findUnique.mockResolvedValue({ ...MOCK_EVENT, attendees: [] });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
        // No Authorization header.
      });

      expect(res.statusCode).toBe(200);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });
  });

  // ── Slug generation edge cases ────────────────────────────────────────────

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

      const slug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(slug).toBe('my-awesome-event');
    });

    it('strips leading and trailing hyphens from slug', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue({ ...MOCK_EVENT, slug: 'event-name' });

      await createEvent(app, { ...baseBody, name: '---Event Name---' });

      const slug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(slug).not.toMatch(/^-|-$/);
    });

    it('collapses multiple consecutive hyphens into one', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);
      prismaMock.event.create.mockResolvedValue({ ...MOCK_EVENT, slug: 'event-name' });

      await createEvent(app, { ...baseBody, name: 'Event   Name' });

      const slug: string = prismaMock.event.create.mock.calls[0][0].data.slug;
      expect(slug).not.toMatch(/--/);
    });
  });
});
