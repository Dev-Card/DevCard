import { type Card, CardVisibility, type Prisma } from '@prisma/client';
import QRCode from 'qrcode';

import { generateUniqueSlug } from '../utils/slug';

import type { CreateCardBody } from '../routes/cards';
import type { FastifyInstance } from 'fastify';

type CardLinkResponse = { platformLink: unknown };
type RawCard = { id: string; title: string; isDefault: boolean; cardLinks: CardLinkResponse[] };
export type CardResponse = { id: string; title: string; isDefault: boolean; links: unknown[] };

export type UpdatedCardResponse = {
  id: string; 
  title: string;
  isDefault:boolean;
}

export interface UpdateCardBody{
  title?:string; 
  description?:string; 
  visibility?: CardVisibility; 
  qrEnabled?: boolean; 
}


function mapCard(card: RawCard): CardResponse {
  return {
    id: card.id,
    title: card.title,
    isDefault: card.isDefault,
    links: card.cardLinks.map((cardLink) => cardLink.platformLink),
  };
}

//List card service
export async function listCards(app: FastifyInstance, userId: string): Promise<CardResponse[]> {
  const cards = (await app.prisma.card.findMany({
    where: { userId },
    take: 50,
    include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })) as unknown as RawCard[];

  return cards.map(mapCard);
}

//Creates card service
export async function createCard(app: FastifyInstance, userId: string, body: CreateCardBody): Promise<CardResponse> {
  const {title , description , linkIds , visibility} = body

  const ownedLinks = await app.prisma.platformLink.findMany({
    where: { id: { in: linkIds }, userId },
    select: { id: true },
  });

  if (ownedLinks.length !== linkIds.length) {
    throw Object.assign(new Error('Link ownership mismatch'), { code: 'OWNERSHIP' });
  } 

  const finalSlug = await generateUniqueSlug(title, async(slug) => {
    const existing = await app.prisma.card.findUnique({
      where: {
        slug
      }
    })
    return !!existing
  })


  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const card = (await app.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const cardCount = await tx.card.count({ where: { userId } });

          return tx.card.create({
            data: {
              userId,
              title,
              slug: finalSlug,
              isDefault: cardCount === 0,
              description, 
              visibility: visibility ?? CardVisibility.PUBLIC,
              cardLinks: {
                create: linkIds.map((linkId, index) => ({ platformLinkId: linkId, displayOrder: index })),
              },
            },
            include: { cardLinks: { include: { platformLink: true }, orderBy: { displayOrder: 'asc' } } },
          });
        },
        {
          isolationLevel: 'Serializable',
        },
      )) as unknown as RawCard;

      return mapCard(card);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2034' &&
        attempt < maxRetries
      ) {
        continue;
      }
      app.log.error(error);
      throw error
    }
  }

  throw new Error('Failed to create card after retrying serialization conflicts');
}

//Update card service
export async function updateCard(
  app: FastifyInstance,
  userId: string,
  id: string,
  body: UpdateCardBody,
): Promise<Card> {
  const {title, description, visibility, qrEnabled} = body

  const existing = await app.prisma.card.findFirst({ where: { id, userId } });
    if (!existing) {
      throw Object.assign(new Error('NotFound'), { code: 'NOT_FOUND' });
    }

  const updated = await app.prisma.card.update({
      where: {
        id, 
      },
      data:{
        title, 
        description, 
        visibility, 
        qrEnabled
      }
  })

  return updated;
}

//Delete card service
export async function deleteCard(app: FastifyInstance, userId: string, id: string): Promise<null> {
  return await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.card.findFirst({ where: { id, userId } });
    if (!existing) {
      throw Object.assign(new Error('NotFound'), { code: 'NOT_FOUND' });
    }

    const userCardCount = await tx.card.count({ where: { userId } });
    if (userCardCount <= 1) {
      throw Object.assign(new Error('Cannot delete last card'), { code: 'LAST_CARD' });
    }

    if (existing.isDefault) {
      const oldestRemainingCard = await tx.card.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { createdAt: 'asc' },
      });

      if (oldestRemainingCard) {
        await tx.card.update({ where: { id: oldestRemainingCard.id }, data: { isDefault: true } });
      }
    }

    await tx.card.delete({ where: { id } });
    return null;
  });
}

//Set default card service
export async function setDefaultCard(app: FastifyInstance, userId: string, id: string): Promise<{ message: string } | null> {
  const existing = await app.prisma.card.findFirst({ where: { id, userId } });

    if (!existing) {
      throw Object.assign(new Error('NotFound'), { code: 'NOT_FOUND' });
    }

  await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.card.updateMany({ where: { userId }, data: { isDefault: false } });
    await tx.card.update({ where: { id }, data: { isDefault: true } });
  });

  return { message: 'Default card updated' };
}

//Adds platfrom link
export async function addPlatFormLinks(app: FastifyInstance, userId: string, id:string, platformLinkId: string): Promise<void> {
    const ownedCard = await app.prisma.card.findFirst({
      where: {
        id, 
        userId
      }
    })

    if (!ownedCard) {
      throw Object.assign(
        new Error('Card not found or you do not have permission to modify it'),
        { code: 'CARD_NOT_FOUND' }
      );
    }
    const [existingLink, platformLink] = await Promise.all([
      app.prisma.cardLink.findUnique({
        where: {
          cardId_platformLinkId: {
            cardId: id,
            platformLinkId,
          },
        },
      }),

      app.prisma.platformLink.findFirst({
        where: {
          id: platformLinkId,
          userId,
        },
      }),
    ]);

    if (!platformLink) {
      throw Object.assign(
        new Error('Platform link not found or does not belong to your account'),
        { code: 'PLATFORM_LINK_NOT_FOUND' }
      );
    }

    if (existingLink) {
      throw Object.assign(
        new Error('This platform link has already been added to the card'),
        { code: 'LINK_ALREADY_EXISTS' }
      );
    }

    await app.prisma.cardLink.create({
      data: {
        cardId: id, 
        platformLinkId
      }
    })
}

//Shares card
export async function shareCard(app: FastifyInstance, userId:string, id: string): Promise<{ shareUrl: string }> {
  const card = await app.prisma.card.findFirst({
    where:{
      id,
      userId
    }
  })

  if (!card) {
    throw Object.assign(
      new Error('Card not found'),
      { code: 'CARD_NOT_FOUND' }
    );
  }


  if(card?.visibility === CardVisibility.PRIVATE){
    throw Object.assign(
      new Error('Private cards cannot be shared'),
      { code: 'CARD_PRIVATE' }
    );
  }

  return {
    shareUrl: `/cards/share/${card.slug}`,
  }; 
}

//Gets share card
export async function getSharedCard(app:FastifyInstance, slug:string): Promise<Prisma.CardGetPayload<{ include: { cardLinks: { include: { platformLink: true } } } }>> {
  const card = await app.prisma.card.findUnique({
    where: {
      slug
    },
    include: {
      cardLinks: {
        include: {
          platformLink: true
        }
      }
    }
  })

  if(!card){
    throw Object.assign(
      new Error('Card not found'),
      { code: 'CARD_NOT_FOUND' }
    );
  }

  return card
}

//Genreate qr
export async function genrateQr(app: FastifyInstance,userId:string, id: string): Promise<Buffer> {
  const card = await app.prisma.card.findFirst({
    where:{
      id,
      userId
    }
  })

  if (!card) {
    throw Object.assign(
      new Error('Card not found'),
      { code: 'CARD_NOT_FOUND' }
    );
  }


  if(card?.visibility === CardVisibility.PRIVATE){
    throw Object.assign(
      new Error('Private cards cannot be shared'),
      { code: 'CARD_PRIVATE' }
    );
  }

  if(!card.qrEnabled){
    throw Object.assign(
      new Error('QR is not availbled for this card'),
      { code: 'QR_DISABLED' }
    );
  }

  const shareUrl = `${process.env.MOBILE_REDIRECT_URI}/cards/share/${card.slug}` 
  const qrImage = await QRCode.toBuffer(shareUrl); 

  if(!qrImage){
    throw Object.assign(
      new Error('QR generation failed'),
      { code: 'QR_IMAGE' }
    );
  }

  return qrImage; 


}

//TODO:Add pagination
export async function cardAnalytics(app: FastifyInstance, userId:string, id: string): Promise<Prisma.CardGetPayload<{ include: { views: { include: { viewer: { select: { id: true; username: true; avatarUrl: true; displayName: true; role: true; accentColor: true } } } } } }>> {
  const card = await app.prisma.card.findFirst({
    where: {
      id, 
      userId
    },
    include: {
      views: {
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          viewer : {
            select: {
              id:true,
              username: true, 
              avatarUrl: true, 
              displayName: true, 
              role: true, 
              accentColor: true
            }
          }
        }
      }
    }, 

  })

  if (!card) {
    throw Object.assign(
      new Error('Card not found'),
      { code: 'CARD_NOT_FOUND' }
    );
  }

  return card
}