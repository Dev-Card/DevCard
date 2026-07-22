import type { FastifyInstance } from 'fastify';

/**
 * Records a connection event when one user connects with another.
 * Privacy Rule: receiverId is ONLY recorded if the receiver is signed in and consents.
 * If the connection is anonymous or unconsented, receiverId MUST be null.
 */
export async function recordConnectionEvent(
  app: FastifyInstance,
  initiatorId: string,
  receiverId: string | null,
  isConsentedAndSignedIn: boolean
) {
  // Structural typing to bypass IDE cache lags after Prisma schema changes
  interface PrismaWithConnectionEvent {
    connectionEvent: {
      create: (args: { data: { initiatorId: string; receiverId: string | null } }) => Promise<unknown>;
    };
  }

  const prismaClient = app.prisma as unknown as PrismaWithConnectionEvent;

  // Enforce privacy rule
  const finalReceiverId = isConsentedAndSignedIn ? receiverId : null;

  const event = await prismaClient.connectionEvent.create({
    data: {
      initiatorId,
      receiverId: finalReceiverId,
    },
  });

  return event;
}
