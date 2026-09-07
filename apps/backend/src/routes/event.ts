import {generateUniqueSlug} from '../utils/slug.js'
import { createEventSchema, joinEventSchema} from '../validations/event.validation.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ── Attendance spam heuristic ────────────────────────────────────────────────
// A user who marks attendance for many events in a very short window is likely
// spamming (marking every hackathon without attending). We record such joins
// with `flagged = true` for moderator review, but still allow the join so that
// normal, fast sign-ups stay frictionless. See README "Attendance spam rules".
const SPAM_WINDOW_MINUTES = 5;
const SPAM_MAX_JOINS = 7;


type EventDetails = {
    id: string;
    name: string;
    slug: string;
    location: string;
    description: string | null;
    organizerId: string; 
    organizerUsername: string;
    organizerDisplayName: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    attendeesCount: number
}

type AttendeePublicProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  role: string;
}


type PaginatedAttendeesResponse = {
  attendees: AttendeePublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;       
  };
}

type EventWithAttendees = {
  _count: {
    attendees: number;
  };
  attendees: {
    role: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      bio: string | null;
      pronouns: string | null;
      company: string | null;
      avatarUrl: string | null;
      accentColor: string;
    };
  }[];
}

export async function eventRoutes(app:FastifyInstance): Promise<void> {
        app.post<{Body: { name: string; description?: string; startDate: string; location: string; endDate: string; isPublic?: boolean; }}>('/', { preHandler: [(req, reply) => app.authenticate(req, reply)] }, async (request, reply) => {
         const userId = request.user.id;
        const parsed = createEventSchema.safeParse(request.body); 
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }
        
        const {name, description, startDate, endDate, isPublic ,location} = parsed.data

        const finalSlug = await generateUniqueSlug(name, async(slug) => {
            const existing = await app.prisma.event.findUnique({where: {slug}})
            
            return !!existing
        })

        const startDateObj = new Date(startDate); 
        const endDateObj = new Date(endDate); 

        try {
            const newEvent = await app.prisma.event.create({
                data: {
                    name, 
                    description, 
                    slug: finalSlug, 
                    location,
                    startDate: startDateObj, 
                    endDate: endDateObj, 
                    isPublic: isPublic ?? true, 
                    organizerId: userId
                }
            })

            return reply.status(201).send(newEvent); 
        } catch (_error) {
            app.log.error('Failed to create event'); 
            return reply.status(500).send({error: 'Failed to create event'})
        }
        
    })

    //Returns event details and attendees count
    app.get('/:slug', async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        const details = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug,
            },
            include: {
                _count: {
                    select: {
                        attendees: true
                    }
                },
                organizer: {
                    select: {
                        username: true,
                        displayName: true
                    }
                }
            }
        })
        if(!details){
            return reply.status(404).send({error: 'Event not found'})
        }

        const response: EventDetails = {
            id: details.id,
            name: details.name,
            slug: details.slug,
            description: details.description,
            location: details.location,
            organizerId: details.organizerId,  
            organizerUsername: details.organizer.username,
            organizerDisplayName: details.organizer.displayName,
            startDate: details.startDate,
            endDate: details.endDate,
            createdAt: details.createdAt,
            attendeesCount: details._count.attendees
        }
        
        return response; 
    })

     app.post<{ Params: { slug: string }; Body: { role?: string } }>('/:slug/join', {
        preHandler: [(req, reply) => app.authenticate(req, reply)],
        // Rate limit (block): fast-reject scripted mass-marking on this route.
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    }, async(request, reply) => {
        const userId = request.user.id;
        const paramsSlug = request.params.slug;

        const parsed = joinEventSchema.safeParse(request.body ?? {});
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }
        const { role } = parsed.data;

        const event = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug
            }
        })

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

        // Heuristic (flag): count how many events this user has joined recently.
        // Exceeding the threshold marks the record as flagged for review without
        // blocking the join, so legitimate users are never stopped.
        const recentJoins = await app.prisma.eventAttendee.count({
            where: {
                userId,
                joinedAt: { gte: new Date(Date.now() - SPAM_WINDOW_MINUTES * 60_000) },
            },
        })
        const flagged = recentJoins >= SPAM_MAX_JOINS;
        if(flagged){
            app.log.warn(`Attendance spam heuristic tripped: userId=${userId} eventId=${event.id} recentJoins=${recentJoins}`)
        }

        try {
            const attendee = await app.prisma.eventAttendee.create({
                data: {
                    eventId: event.id,
                    userId,
                    role,
                    flagged,
                }
            })

            return reply.status(201).send({message: 'User joined successfully', role: attendee.role, flagged: attendee.flagged})
        } catch (error:any) {
            if(error.code === "P2002" ){
                return reply.status(409).send({error: 'Already joined'})
            }
            app.log.error((error as Error).message);
            return reply.status(500).send({error: 'Failed to join'})
        }

    })
    app.delete<{Params: {slug: string}}>('/:slug/leave',{preHandler: [(req, reply) => app.authenticate(req, reply)]}, async(request, reply) => {

       const userId = request.user.id;
        const paramsSlug = request.params.slug; 

        const event = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug
            }
        })

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

        try {
            await app.prisma.eventAttendee.delete({
                where: {
                    userId_eventId: {
                        userId, 
                        eventId: event.id
                    }
                }
            })
            return reply.status(204).send()
        } catch (error:any) {
            if(error.code === 'P2025'){
                return reply.status(404).send({error: 'User not found'})
            }
            app.log.error((error as Error).message)
            return reply.status(500).send({error: 'Failed to leave'})
        }
    })

    app.get('/:slug/attendees', async(request: FastifyRequest<{Params: {slug: string}, Querystring: {page?:string; limit?: string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        const page = Math.max(1, Number(request.query.page) || 1); 
        const limit = Math.min(50, Number(request.query.limit) || 10); 
        const skip = (page - 1) * limit
        const event = await app.prisma.event.findUnique({
            where: {
                slug: paramsSlug
            }, 
            include: {
                _count: {
                    select: { attendees: true }
                },
                attendees : {
                    select: {
                        role: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName:true,
                                bio: true,
                                pronouns: true,
                                company: true,
                                avatarUrl: true,
                                accentColor: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: {joinedAt: 'desc'}
                }
            }, 
        })as EventWithAttendees | null;

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

         
        const attendees = event.attendees.map((attendee: EventWithAttendees['attendees'][number]) => ({
            id: attendee.user.id,
            username: attendee.user.username,
            displayName: attendee.user.displayName,
            bio: attendee.user.bio,
            pronouns: attendee.user.pronouns,
            company: attendee.user.company,
            avatarUrl: attendee.user.avatarUrl,
            accentColor: attendee.user.accentColor,
            role: attendee.role,
        }));

        const response: PaginatedAttendeesResponse = {
            attendees,
            pagination: {
                page, 
                limit, 
                total : event._count.attendees,
            }
        }

        return response; 
    })
}
