import Fastify from 'fastify';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { eventRoutes } from '../routes/event';

import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance,LightMyRequestResponse } from 'fastify';

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
// Builds a minimal Fastify instance that wires up:
//   • app.prisma  – the Prisma mock above
//   • request.jwtVerify() – overridden per-test via `mockJwtVerify`
//
// This mirrors the real app setup without touching a real DB or real JWT keys.

const mockJwtVerify = vi.fn();

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Decorate prisma so routes can use app.prisma.*
  app.decorate('prisma', prismaMock as unknown as PrismaClient);

  // Decorate jwtVerify on the request prototype so request.jwtVerify() resolves
  // to whatever the current test wants.
  app.decorateRequest('jwtVerify', function () {
    return mockJwtVerify();
  });
  app.decorate('authenticate', async function (request, reply) {
  try {
    const payload = await request.jwtVerify();
    if (payload) { request.user = payload as typeof request.user; }
    } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
  // Register with the same prefix used in production (app.ts) so that
  // tests exercise routes at their real paths — /api/events, /api/events/:slug, etc.
  await app.register(eventRoutes, { prefix: '/api/events' });
  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a valid JWT-authenticated inject payload */
function authHeader(): Record<string, string> {
  return { Authorization: 'Bearer mock-token' };
}

/** Injects a POST /api/events request */
async function createEvent(
  app: FastifyInstance,
  body: Record<string, unknown>,
  authenticated = true,
): Promise<LightMyRequestResponse>  {
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
    // Default: authenticated as MOCK_USER_ID
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
      prismaMock.event.findUnique.mockResolvedValue(null); // slug is free
      prismaMock.event.create.mockResolvedValue(MOCK_EVENT);

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.slug).toBe('devcard-conf-2025');
      expect(body.organizerId).toBe(MOCK_USER_ID);
      expect(body.location).toBe('San Francisco, CA');

      // Prisma was called with correct fields
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
      const res = await createEvent(app, { name: 'Hello World' }); // missing dates + location
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
      const longName = 'A'.repeat(101);
      const res = await createEvent(app, { ...validBody, name: longName });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects invalid date format', async () => {
      const res = await createEvent(app, {
        ...validBody,
        startDate: 'not-a-date',
      });
      expect(res.statusCode).toBe(400);
    });

    it('201 — generates a unique slug when the first candidate is taken', async () => {
      // First findUnique returns a conflict, second returns null (slug free)
      prismaMock.event.findUnique
        .mockResolvedValueOnce(MOCK_EVENT) // slug taken
        .mockResolvedValueOnce(null);       // randomised slug free

      prismaMock.event.create.mockResolvedValue({
        ...MOCK_EVENT,
        slug: 'devcard-conf-2025-ab12',
      });

      const res = await createEvent(app, validBody);

      expect(res.statusCode).toBe(201);
      // create was eventually called with a slug different from the base one
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
    it('200 — returns event info with attendee count', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        organizer: { username: 'johndoe', displayName: 'John Doe' },
        _count: { attendees: 42 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
      });
      console.log(JSON.stringify(res.json(), null, 2));
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.slug).toBe('devcard-conf-2025');
      expect(body.attendeesCount).toBe(42);
      expect(body.location).toBe('San Francisco, CA');
      // organizerId is exposed (public info)
      expect(body.organizerId).toBe(MOCK_USER_ID);
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
      // Even if JWT would fail, this route should not call jwtVerify
      mockJwtVerify.mockRejectedValue(new Error('Should not be called'));
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        organizer: { username: 'johndoe', displayName: 'John Doe' },
        _count: { attendees: 0 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025',
        // No Authorization header
      });

      expect(res.statusCode).toBe(200);
      expect(mockJwtVerify).not.toHaveBeenCalled();
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

    it('409 — returns 409 when user already joined the event', async () => {
      prismaMock.event.findUnique.mockResolvedValue(MOCK_EVENT);
      // Prisma unique constraint error
      const uniqueError = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
      });
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

      mockJwtVerify.mockResolvedValue({ id: MOCK_OTHER_USER_ID });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/events/devcard-conf-2025/leave',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(204);

      // Verify the compound unique key used in the delete
      const deleteArg = prismaMock.eventAttendee.delete.mock.calls[0][0].where;
      expect(deleteArg).toMatchObject({
        userId_eventId: {
          userId: MOCK_OTHER_USER_ID,
          eventId: MOCK_EVENT.id,
        },
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
      // Prisma record-not-found error
      const notFoundError = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      });
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
    /** Builds a raw EventAttendee row as Prisma returns it (with nested user) */
    function makeAttendeeRow(
      profile: typeof MOCK_USER_PROFILE | typeof MOCK_OTHER_USER_PROFILE,
          ) : {
        id: string;
        userId: string;
        eventId: string;
        joinedAt: Date;
        user: typeof MOCK_USER_PROFILE | typeof MOCK_OTHER_USER_PROFILE;
      }  {
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
        attendees: attendeeRows,
        _count: { attendees: 2 },  
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
        attendees: [makeAttendeeRow(MOCK_OTHER_USER_PROFILE)],
        _count: { attendees: 1 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?page=2&limit=5',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(5);

      // Verify skip/take were passed correctly to Prisma
      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.skip).toBe(5);   // (page-1) * limit = 1 * 5
      expect(includeArg.attendees.take).toBe(5);
    });

    it('200 — caps limit at 50 even if higher value is requested', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        attendees: [],
        _count: { attendees: 0 },
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
        attendees: [],
        _count: { attendees: 0 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees?page=0',
      });

      expect(res.statusCode).toBe(200);
      const includeArg = prismaMock.event.findUnique.mock.calls[0][0].include;
      expect(includeArg.attendees.skip).toBe(0); // page forced to 1 → skip = 0
    });

    it('200 — returns empty attendees list for event with no attendees', async () => {
      prismaMock.event.findUnique.mockResolvedValue({
        ...MOCK_EVENT,
        attendees: [],
        _count: { attendees: 0 }, 
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
        attendees: [makeAttendeeRow(MOCK_USER_PROFILE)],
        _count: { attendees: 1 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/events/devcard-conf-2025/attendees',
      });

      const attendee = res.json().attendees[0];

      // These fields MUST be present
      expect(attendee).toHaveProperty('id');
      expect(attendee).toHaveProperty('username');
      expect(attendee).toHaveProperty('displayName');
      expect(attendee).toHaveProperty('accentColor');

      // These fields MUST NOT be present
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
