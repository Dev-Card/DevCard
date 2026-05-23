import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createEventSchema, joinEventSchema} from '../validations/event.validation';

type EventDetails = {
    id: string; 
    name: string; 
    slug: string; 
    location: string; 
    description: string | null; 
    organizerId: string; 
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
}


type PaginatedAttendeesResponse = {
  attendees: AttendeePublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;       
  };
}

export async function eventRoutes(app:FastifyInstance) {
    app.post('/' , async(request: FastifyRequest<{
        Body: {
            name: string,
            description?: string,
            startDate: string,
            location: string,
            endDate: string,
            isPublic?: boolean
    }}>, reply: FastifyReply) => {
        let decoded; 
        try {
            decoded = await request.jwtVerify() as any;
        } catch (error) {
            return reply.status(401).send({error : 'Unauthorized'})
        }
        const userId = decoded.id
        const parsed = createEventSchema.safeParse(request.body); 
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }
        
        const {name, description, startDate, endDate, isPublic ,location} = parsed.data

        let cleanSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
        let finalSlug = cleanSlug; 

        while(true){
            const existing = await app.prisma.event.findUnique({where: {slug : finalSlug}}); 

            if(!existing){
                break; 
            }
            const randomSuffix  = Math.random().toString(36).substring(2,6); 
            finalSlug = `${cleanSlug}-${randomSuffix}`
        }

        const startDateObj = new Date(startDate); 
        const endDateObj = new Date(endDate); 

        try {
            const newEvent = await app.prisma.event.create({
                data: {
                    name, 
                    description, 
                    slug: finalSlug, 
                    location: location,
                    startDate: startDateObj, 
                    endDate: endDateObj, 
                    isPublic: isPublic ?? true, 
                    organizerId: userId
                }
            })

            return reply.status(201).send(newEvent); 
        } catch (error) {
            app.log.error('Failed to create event'); 
            return reply.status(500).send({error: 'Failed to create event'})
        }
        
    })

    //Returns event details and attendees count
    app.get('/:slug', async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        const details = await app.prisma.event.findUnique({
            where: {
                slug : paramsSlug, 
            },
            include: {
                _count: {
                    select: {
                        attendees: true
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
            startDate: details.startDate,
            endDate: details.endDate, 
            createdAt: details.createdAt, 
            attendeesCount: details._count.attendees
        }
        
        return response; 
    })

    app.post('/:slug/join' , async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
        let decoded; 
        try {
            decoded = await request.jwtVerify() as any; 
        } catch (error) {
            return reply.status(401).send({error: 'Unauthorized'})
        }
        const userId = decoded.id
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
            await app.prisma.eventAttendee.create({
                data: {
                    eventId: event.id, 
                    userId: userId, 
                    joinedAt: new Date()
                }
            })

            return reply.status(201).send({message: 'User joined successfully'})
        } catch (error:any) {
            if(error.code === "P2002" ){
                return reply.status(409).send({error: 'Already joined'})
            }
            app.log.error((error as Error).message); 
            return reply.status(500).send({error: 'Failed to join'})
        }

    })

    app.delete('/:slug/leave',async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
        let decoded; 
        try {
            decoded = await request.jwtVerify() as any
        } catch (error) {
            return reply.status(401).send({error: 'Unauthorized'}); 
        }
        const userId = decoded.id
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
                        userId: userId, 
                        eventId: event.id
                    }
                }
            })
            return reply.status(204).send({message: 'User left'})
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
                    include: {
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
        })

        if(!event){
            return reply.status(404).send({error: 'Event not found'})
        }

         
        const attendees = event.attendees.map(attendee => ({
            id: attendee.user.id,
            username: attendee.user.username,
            displayName: attendee.user.displayName,
            bio: attendee.user.bio,
            pronouns: attendee.user.pronouns,
            company: attendee.user.company,
            avatarUrl: attendee.user.avatarUrl,
            accentColor: attendee.user.accentColor,
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