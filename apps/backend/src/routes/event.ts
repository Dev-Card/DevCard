import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createEventSchema } from '../validations/event.validation.js';

// ── Response types ────────────────────────────────────────────────────────────

type EventDetails = {
  id: string;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  organizerUsername: string;
  organizerDisplayName: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  attendeesCount: number;
};

type AttendeePublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
};

type PaginatedAttendeesResponse = {
  attendees: AttendeePublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

// ── Visibility helpers ────────────────────────────────────────────────────────

type AccessResult = 'allowed' | 'unauthenticated' | 'forbidden';

/**
 * Extracts the authenticated user ID from the Bearer JWT when present.
 * Returns null for unauthenticated requests or invalid/expired tokens.
 * Never throws — safe to call on any request regardless of auth state.
 */
async function getRequestUserId(request: FastifyRequest): Promise<string | null> {
  if (!request.headers.authorization) return null;
  try {
    const decoded = (await request.jwtVerify()) as { id: string };
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Determines whether a caller may view the given event.
 *
 * Access rules:
 *   - Public events  → always accessible.
 *   - Private events → organizer or confirmed attendee only.
 *
 * Returns 'unauthenticated' vs 'forbidden' so callers can issue
 * semantically distinct 401 vs 403 responses.
 */
async function canAccessEvent(
  app: FastifyInstance,
  event: { id: string; isPublic: boolean; organizerId: string },
  userId: string | null,
): Promise<AccessResult> {
  if (event.isPublic) return 'allowed';
  if (!userId) return 'unauthenticated';
  if (userId === event.organizerId) return 'allowed';

  const membership = await app.prisma.eventAttendee.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
    select: { userId: true },
  });

  return membership ? 'allowed' : 'forbidden';
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function eventRoutes(app: FastifyInstance) {
  // ─── Create Event ─────────────────────────────────────────────────────────

  app.post('/', async (
    request: FastifyRequest<{
      Body: {
        name: string;
        description?: string;
        startDate: string;
        location: string;
        endDate: string;
        isPublic?: boolean;
      };
    }>,
    reply: FastifyReply,
  ) => {
    let decoded: { id: string };
    try {
      decoded = (await request.jwtVerify()) as { id: string };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = decoded.id;
    const parsed = createEventSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad request' });
    }

    const { name, description, startDate, endDate, isPublic, location } = parsed.data;

    // Derive a URL-safe slug from the event name and ensure it is unique.
    // The loop retries with a short random suffix on collision.
    let cleanSlug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    let finalSlug = cleanSlug;

    while (true) {
      const existing = await app.prisma.event.findUnique({ where: { slug: finalSlug } });
      if (!existing) break;
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      finalSlug = `${cleanSlug}-${randomSuffix}`;
    }

    try {
      const newEvent = await app.prisma.event.create({
        data: {
          name,
          description,
          slug: finalSlug,
          location,
          startDate,
          endDate,
          isPublic: isPublic ?? true,
          organizerId: userId,
        },
      });
      return reply.status(201).send(newEvent);
    } catch (error) {
      app.log.error('Failed to create event');
      return reply.status(500).send({ error: 'Failed to create event' });
    }
  });

  // ─── Event Details ────────────────────────────────────────────────────────

  app.get('/:slug', async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;

    const details = await app.prisma.event.findUnique({
      where: { slug },
      include: {
        _count: { select: { attendees: true } },
        organizer: {
          select: { username: true, displayName: true },
        },
      },
    });

    if (!details) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    // Enforce visibility: public events are open; private events are restricted
    // to the organizer and confirmed attendees.
    const userId = await getRequestUserId(request);
    const access = await canAccessEvent(app, details, userId);

    if (access === 'unauthenticated') {
      return reply.status(401).send({ error: 'Authentication required to view this event' });
    }
    if (access === 'forbidden') {
      return reply.status(403).send({ error: 'You do not have access to this event' });
    }

    const response: EventDetails = {
      id: details.id,
      name: details.name,
      slug: details.slug,
      description: details.description,
      location: details.location,
      organizerUsername: details.organizer.username,
      organizerDisplayName: details.organizer.displayName,
      startDate: details.startDate,
      endDate: details.endDate,
      createdAt: details.createdAt,
      attendeesCount: details._count.attendees,
    };

    return response;
  });

  // ─── Join Event ───────────────────────────────────────────────────────────

  app.post('/:slug/join', async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply,
  ) => {
    let decoded: { id: string };
    try {
      decoded = (await request.jwtVerify()) as { id: string };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = decoded.id;
    const { slug } = request.params;

    const event = await app.prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    try {
      await app.prisma.eventAttendee.create({
        data: { eventId: event.id, userId, joinedAt: new Date() },
      });
      return reply.status(201).send({ message: 'User joined successfully' });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Already joined' });
      }
      app.log.error((error as Error).message);
      return reply.status(500).send({ error: 'Failed to join' });
    }
  });

  // ─── Leave Event ──────────────────────────────────────────────────────────

  app.delete('/:slug/leave', async (
    request: FastifyRequest<{ Params: { slug: string } }>,
    reply: FastifyReply,
  ) => {
    let decoded: { id: string };
    try {
      decoded = (await request.jwtVerify()) as { id: string };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = decoded.id;
    const { slug } = request.params;

    const event = await app.prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    try {
      await app.prisma.eventAttendee.delete({
        where: { userId_eventId: { userId, eventId: event.id } },
      });
      return reply.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'User not found' });
      }
      app.log.error((error as Error).message);
      return reply.status(500).send({ error: 'Failed to leave' });
    }
  });

  // ─── Paginated Attendee List ──────────────────────────────────────────────

  app.get('/:slug/attendees', async (
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { page?: string; limit?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(50, Number(request.query.limit) || 10);
    const skip = (page - 1) * limit;

    const event = await app.prisma.event.findUnique({
      where: { slug },
      include: {
        _count: { select: { attendees: true } },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                pronouns: true,
                company: true,
                avatarUrl: true,
                accentColor: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { joinedAt: 'desc' },
        },
      },
    }) as any;

    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    // Enforce visibility before returning any attendee data.
    const userId = await getRequestUserId(request);
    const access = await canAccessEvent(app, event, userId);

    if (access === 'unauthenticated') {
      return reply.status(401).send({ error: 'Authentication required to view this event' });
    }
    if (access === 'forbidden') {
      return reply.status(403).send({ error: 'You do not have access to this event' });
    }

    const attendees: AttendeePublicProfile[] = event.attendees.map((row: any) => ({
      id: row.user.id,
      username: row.user.username,
      displayName: row.user.displayName,
      bio: row.user.bio,
      pronouns: row.user.pronouns,
      company: row.user.company,
      avatarUrl: row.user.avatarUrl,
      accentColor: row.user.accentColor,
    }));

    const response: PaginatedAttendeesResponse = {
      attendees,
      pagination: { page, limit, total: event._count.attendees },
    };

    return response;
  });
}
