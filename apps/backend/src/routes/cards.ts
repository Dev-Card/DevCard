import * as cardService from '../services/cardService'
import { handleDbError } from '../utils/error.util.js';
import { createCardSchema ,updateCardSchema, addPlatformLinkSchema} from '../validations/card.validation';

import type { CardResponse } from '../services/cardService';
import type { Card } from '@devcard/shared';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CardVisibility } from '@prisma/client';
import { request } from 'http';

export interface CreateCardBody {
  title: string;
  linkIds: string[];
  description?: string; 
  visibility?: CardVisibility
}

interface UpdateCardBody {
  title?: string;
  linkIds?: string[];
}

interface CardParams {
  id: string;
}

interface PlatformLink {
  id: string;
  userId: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
  createdAt: Date;
}

interface CardLinkWithPlatform {
  id: string;
  cardId: string;
  platformLinkId: string;
  displayOrder: number;
  platformLink: PlatformLink;
}

interface _CardWithLinks {
  id: string;
  userId: string;
  title: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  cardLinks: CardLinkWithPlatform[];
}

export async function cardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    const server = request.server as any;
    if (typeof server?.authenticate === 'function') { await server.authenticate(request, reply); return }
    if (typeof (app as any).authenticate === 'function') { await (app as any).authenticate(request, reply); return }
    try { await request.jwtVerify() } catch (_e) { reply.status(401).send({ error: 'Unauthorized' }) }
  });

  // ─── List Cards ───

  app.get('/', async (request: FastifyRequest, reply: FastifyReply): Promise<CardResponse[] | void> => {
    const userId = (request.user as { id: string }).id;
    try {
      return await cardService.listCards(app, userId)
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  });

  // ─── Creates Card ───
  app.post('/', async (request: FastifyRequest<{ Body: CreateCardBody }>, reply: FastifyReply): Promise<Card | void> => {
    const userId = (request.user as { id: string }).id;
    const parsed = createCardSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    try {
      const card = await cardService.createCard(app, userId, parsed.data)
      return reply.status(201).send(card)
    } catch (error: any) {
      if (error?.code === 'OWNERSHIP'){return reply.status(403).send({ error: 'One or more links do not belong to your account' })}
      return handleDbError(error, request, reply)
    }
  });

  // ─── Update Card ───
  app.put('/:id', async (request: FastifyRequest<{ Params: CardParams; Body: UpdateCardBody }>, reply: FastifyReply): Promise<CardResponse> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const parsed = updateCardSchema.safeParse(request.body)
      if (!parsed.success) {return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() })}
      const updated = await cardService.updateCard(app, userId, id, parsed.data)
      if (!updated) {return reply.status(404).send({ error: 'Card not found' })}
      return updated
    } catch (error: any) {
      if (error?.code === 'OWNERSHIP') {return reply.status(403).send({ error: 'One or more links do not belong to your account' })}
      return handleDbError(error, request, reply)
    }
  });

  // ─── Delete Card ───

  app.delete('/:id', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      await cardService.deleteCard(app, userId, id)
      return reply.status(204).send()
    } catch (error:any) {
        if (error?.code === 'NOT_FOUND') {
          return reply.status(404).send({ error: 'Card not found' });
        }

        if (error?.code === 'LAST_CARD') {
          return reply.status(400).send({
            error: 'Cannot delete the last remaining card. A user must have at least one card.',
          });
        }
      return handleDbError(error, request, reply)
    }
  });

  // ─── Set Default Card ───
  app.put('/:id/default', async (request: FastifyRequest<{ Params: CardParams }>, reply: FastifyReply): Promise<object | void> => {
    const userId = (request.user as { id: string }).id;
    const { id } = request.params;

    try {
      const resp = await cardService.setDefaultCard(app, userId, id)
      if (!resp) {return reply.status(404).send({ error: 'Card not found' })}
      return resp
    } catch (error) {
      return handleDbError(error, request, reply)
    }
  });

  //Add platform-link
  app.put('/:id/platform-link', async(request: FastifyRequest<{Params:{id: string}, Body: {platformLinkId: string}}>, reply: FastifyReply) => {
    const cardId = request.params.id; 
    const userId = request.user.id; 
    const parsed = addPlatformLinkSchema.safeParse(request.body); 

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    
    try {

      const platformLinkId = parsed.data.platformLinkId
      await cardService.addPlatFormLinks(app, userId, cardId, platformLinkId)
      
      return reply.status(200).send('Platform link added successfully')
      
    } catch (error: any) {
      if (error?.code === 'CARD_NOT_FOUND') {
        return reply.status(404).send({
          error: error.message,
        });
      }

      if (error?.code === 'PLATFORM_LINK_NOT_FOUND') {
        return reply.status(403).send({
          error: error.message,
        });
      }

      if (error?.code === 'LINK_ALREADY_EXISTS') {
        return reply.status(409).send({
          error: error.message,
        });
      }
      app.log.error(error)
      handleDbError(error, request, reply)
    }
  })

  //Share card
  app.post('/:id/share',async(request: FastifyRequest<{Params: {id: string}}>, reply:FastifyReply) => {
    const cardId = request.params.id; 
    const userId = request.user.id; 

    try {
      const link = await cardService.shareCard(app, userId, cardId); 
      return reply.status(200).send(link)
    } catch (error:any) {
      if (error?.code === 'CARD_NOT_FOUND') {
        return reply.status(404).send({
          error: error.message,
        });
      }
      if (error?.code === 'CARD_PRIVATE') {
        return reply.status(403).send({
          error: error.message,
        });
      }
      
      app.log.error(error)
      handleDbError(error, request, reply)
    }
  })

  //Get shared card
  app.get('/share/:slug', async(request: FastifyRequest<{Params: {slug: string}}>, reply: FastifyReply) => {
    const paramsSlug = request.params.slug; 
    
    try {
      const card = await cardService.getSharedCard(app, paramsSlug)
      return reply.status(200).send(card)
    } catch (error:any) {
      if (error?.code === 'CARD_NOT_FOUND') {
        return reply.status(404).send({
          error: error.message,
        });
      }

      app.log.error(error)
      handleDbError(error, request,reply)
    }
  })
}
