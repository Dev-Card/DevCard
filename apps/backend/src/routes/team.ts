import {Prisma, TeamRole } from '@prisma/client';
import QRCode from 'qrcode'

import {generateUniqueSlug} from '../utils/slug'
import { createTeamScehma,inviteMembers,updateTeam } from '../validations/team.validation';

import type {PlatformLink, PublicProfile} from '@devcard/shared'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

type TeamMember = PublicProfile & {
    teamRole: TeamRole
    joinedAt: Date; 
}

type TeamProfile = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  members: TeamMember[];
}

export async function teamRoutes(app:FastifyInstance){
        app.post('/', { preHandler: [async (request, reply) => {
            const server = request.server as any;
            if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
            if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
            try { const payload = await request.jwtVerify(); if (payload) (request as any).user = payload; } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
        }] }, async(request:FastifyRequest<{
        Body: {name: string, description? : string, avatarUrl?: string }
    }>, reply: FastifyReply) => {
        const userId = (request.user as any).id;
        const parsed = createTeamScehma.safeParse(request.body); 
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }; 
        const {name , description , avatarUrl} = parsed.data; 

        const finalSlug = await generateUniqueSlug(name, async(slug) => {
            const existing = await app.prisma.team.findUnique({where: {slug }})

            return !!existing
        })

        try {
            const team = await app.prisma.$transaction(async (tx) => {
                const team = await tx.team.create({
                    data: {
                        name, 
                        slug: finalSlug, 
                        description, 
                        avatarUrl, 
                        ownerId: userId, 
                    }
                })
    
                await tx.teamMember.create({
                    data: {
                        teamId : team.id, 
                        userId, 
                        role: TeamRole.OWNER, 
                        joinedAt: new Date(), 
                    }
                })
                return team
            })   
            return reply.status(201).send(team)

        }catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                case 'P2002':
                    return reply.status(409).send({
                    error: 'Team slug already exists'
                    });

                case 'P2003':
                    return reply.status(400).send({
                    error: 'Invalid organizer'
                    });
                }
            }
            app.log.error('Failed to create a team');
            return reply.status(500).send({
                error: 'Failed to create team'
            });
        }
    })

    app.get('/:slug', async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug;

        try {
            const details = await app.prisma.team.findUnique(
                {
                    where: {slug: paramsSlug}, 
                    include: {
                        members: {
                            include: {
                                user: {
                                    include: {
                                        platformLinks: true
                                    }
                                } 
                            }
                        }
                    }
                }
            )

            if(!details){
                return reply.status(404).send({error: 'Team not found'})
            }

            const members =  details.members.map((tm): TeamMember => ({
                username: tm.user.username,
                displayName: tm.user.displayName,
                bio: tm.user.bio,
                pronouns: tm.user.pronouns,
                role: tm.user.role,
                company: tm.user.company,
                avatarUrl: tm.user.avatarUrl,
                accentColor: tm.user.accentColor,
                links: tm.user.platformLinks.map((pl: PlatformLink) => ({
                    id: pl.id,
                    platform: pl.platform,
                    username: pl.username,
                    url: pl.url,
                    displayOrder: pl.displayOrder,
                })),
                teamRole: tm.role, 
                joinedAt: tm.joinedAt, 

            }))

            const response: TeamProfile = {
                id: details.id, 
                name: details.name, 
                slug: details.slug, 
                description: details.description, 
                avatarUrl: details.avatarUrl, 
                ownerId: details.ownerId, 
                createdAt: details?.createdAt, 
                updatedAt: details.updatedAt, 
                members 
            }

            return response; 
        } catch (error) {
            app.log.error(error); 
            return reply.status(500).send('Database query failed')
        }

    })

        app.post('/:slug/members', { preHandler: [async (request, reply) => {
            const server = request.server as any;
            if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
            if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
            try { const payload = await request.jwtVerify(); if (payload) (request as any).user = payload; } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) }
        }] }, async(request: FastifyRequest<{Params: {slug:string}, Body:{username:string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        const userId = (request.user as any).id;
        const parsed = inviteMembers.safeParse(request.body); 
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }; 
        const {username} = parsed.data; 
        try {
            const teamDetails = await app.prisma.team.findUnique(
                {where: {slug: paramsSlug },
                include:{
                    owner: true, 
                    members: {
                        include: {
                            user: true
                        }
                    }
                }
            }
            )
            if(!teamDetails){
                return reply.status(404).send('Team not found'); 
            }
            //Check request user is owner
            if(teamDetails?.ownerId !== userId){
                return reply.status(403).send('Forbidden')
            }

            const alreadyMember = teamDetails.members.find((u) => u.user.username === username) 

            //Check invited username is not a member and owner; 
            if(alreadyMember || teamDetails.owner.username === username){
                return reply.status(409).send('Conflict')
            }

            const invitedUserDetails = await app.prisma.user.findUnique((
                {where: {
                username
            }}))

            if(!invitedUserDetails){
                return reply.status(404).send('User not found')
            }

            await app.prisma.teamMember.create({
                data: {
                    teamId: teamDetails.id, 
                    userId: invitedUserDetails.id, 
                    role: TeamRole.MEMBER, 
                    joinedAt: new Date()
                }
            })

            return reply.status(201).send('User invited')

        } catch (error) {
            app.log.error(error); 
            return reply.status(500).send('Database query failed')
        }
    })

    app.delete('/:slug/members/:userId', { preHandler: [async (request, reply) => { const server = request.server as any; if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return } if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return } try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) } }] }, async(request: FastifyRequest<{Params: {slug: string, userId: string}}>, reply: FastifyReply)  => {
        const paramsSlug = request.params.slug 
        const paramsUserId = request.params.userId
        const userID = (request.user as any).id; 
        const teamDetails = await app.prisma.team.findUnique(
            {where: {slug: paramsSlug},
            include: {
                members: {
                    include:{
                        user: true
                    }
                }
            }
        })

        if(!teamDetails){
            return reply.status(404).send({error: 'Team not found'})
        }

        const isMember = teamDetails.members.find((m) => paramsUserId === m.user.id)

        if(!isMember){
            return reply.status(404).send({
                error: 'Member not found',
            });
        }

        const isOwner = teamDetails.ownerId === userID; 
        const isSelfRemove = paramsUserId === userID; 

        if (!isOwner && !isSelfRemove) {
            return reply.status(403).send({
                error: 'Forbidden',
            });
        }

        //TODO: Assign owner role to next person
        if(paramsUserId === teamDetails.ownerId){
            return reply.status(403).send({
                error: 'Owner cannot leave team',
            });
        }

        if(isOwner || isSelfRemove){
            try {
                await app.prisma.teamMember.delete({
                    where: {
                        userId_teamId: {
                            teamId: teamDetails.id,
                            userId: paramsUserId
                        }
                    }
                })
                reply.status(200).send('Member removed')
            } catch (error) {
                app.log.error(error); 

                return reply.status(500).send('DB query failed')
            }
        }
    })

    app.patch('/:slug',{ preHandler: [async (request, reply) => { const server = request.server as any; if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return } if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return } try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) } }] }, async(request: FastifyRequest<{Params: {slug: string},Body: {description?:string, name?:string, avatarUrl?:string}}>, reply: FastifyReply) => {
        const userId = (request.user as any).id; 
        const paramsSlug = request.params.slug; 
        const parsed = updateTeam.safeParse(request.body); 
        if(!parsed.success){
            return reply.status(400).send({error: 'Bad request'})
        }; 

        const {name, description,avatarUrl} = parsed.data; 


        const teamDetails = await app.prisma.team.findUnique({where:{slug: paramsSlug}})

        if(!teamDetails){
            return reply.status(404).send('Team not found'); 
        }
        
        if(teamDetails.ownerId !== userId){
            return reply.status(403).send({
                error: 'Forbidden',
            });
        }

        try {
            const updatedTeam = await app.prisma.team.update({
                where: {
                    slug: paramsSlug
                },
                data: {
                    name,
                    description,
                    avatarUrl, 
                }
            })
            return reply.status(200).send(updatedTeam)
        } catch (error) {
            app.log.error(error); 
            return reply.status(500).send('DB query failed')
        }
        
    })

    app.delete('/:slug',{ preHandler: [async (request, reply) => { const server = request.server as any; if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return } if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return } try { await request.jwtVerify() } catch (e) { reply.status(401).send({ error: 'Unauthorized' }) } }] }, async(request:FastifyRequest<{Params:{slug: string}}>, reply:FastifyReply) => {
        const userId = (request.user as any).id; 
        const paramsSlug = request.params.slug; 


        const teamDetails = await app.prisma.team.findUnique({
            where:{
                slug: paramsSlug
            }
        })

        if(!teamDetails){
            return reply.status(404).send('Team not found'); 
        }
        
        if(teamDetails.ownerId !== userId){
            return reply.status(403).send({
                error: 'Forbidden',
            });
        }

        try {
            await app.prisma.team.delete({
                where: {
                    slug: paramsSlug, 
                }
            })

            return reply.status(200).send('Team deleted')
        } catch (error) {
            app.log.error(error)

            return reply.status(500).send('DB query failed')
        }
    })

    app.get('/:slug/qr',async(request:FastifyRequest<{Params:{slug:string}}>, reply: FastifyReply) => {
        const paramsSlug = request.params.slug; 
        try {
            const teamDetails = await app.prisma.team.findUnique({
                where: {
                    slug: paramsSlug
                }
            })
    
            if(!teamDetails){
                return reply.status(404).send('Team not found'); 
            }
    
            const url = `https://devcard.dev/team/${teamDetails.slug}`
            const qrImage = await QRCode.toBuffer(url)
            return reply.type('image/png').send(qrImage)
        } catch (error) {
            app.log.error(error); 
            return reply.status(500).send("QR generation failed")
        }

    })
}