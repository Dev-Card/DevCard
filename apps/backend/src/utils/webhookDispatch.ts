import crypto from 'node:crypto';

import { decrypt } from './encryption.js';

// Use a minimal type for the Prisma client to avoid depending on generated types.
// The actual PrismaClient instance is provided at runtime via the Fastify plugin.
type PrismaLike = {
  webhookEndpoint: {
    findMany: (args: any) => Promise<any[]>;
  };
  webhookDelivery: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

// Retry delays in milliseconds: 30s, 5min, 30min
const RETRY_DELAYS_MS = [30_000, 300_000, 1_800_000];
const MAX_ATTEMPTS = 3;
const DELIVERY_TIMEOUT_MS = 5_000;

/**
 * Sign a JSON payload string with HMAC-SHA256.
 * Returns the hex digest string (without the "sha256=" prefix).
 */
export function signPayload(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Attempt a single webhook delivery.
 * Returns { success, statusCode } indicating whether the remote accepted (2xx).
 */
export async function attemptDelivery(
  url: string,
  payloadString: string,
  signature: string,
): Promise<{ success: boolean; statusCode: number | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DevCard-Signature': `sha256=${signature}`,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
    };
  } catch {
    clearTimeout(timeout);
    return { success: false, statusCode: null };
  }
}

/**
 * Deliver a single webhook and handle retries.
 * This function updates the WebhookDelivery record in the database after each attempt.
 */
export async function deliverWebhook(
  prisma: PrismaLike,
  deliveryId: string,
  endpointUrl: string,
  encryptedSecret: string,
  payloadString: string,
): Promise<void> {
  const secret = decrypt(encryptedSecret);
  const signature = signPayload(secret, payloadString);
  const { success, statusCode } = await attemptDelivery(endpointUrl, payloadString, signature);

  // Fetch current delivery to get attempt count
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    return;
  }

  const newAttempts = delivery.attempts + 1;

  if (success) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'success',
        responseCode: statusCode,
        attempts: newAttempts,
        nextRetryAt: null,
        deliveredAt: new Date(),
      },
    });
    return;
  }

  // Failed — check if we can retry
  if (newAttempts < MAX_ATTEMPTS) {
    const delayMs = RETRY_DELAYS_MS[newAttempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const nextRetryAt = new Date(Date.now() + delayMs);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts: newAttempts,
        responseCode: statusCode,
        nextRetryAt,
        errorMessage: `Delivery failed with status ${statusCode ?? 'network error'}`,
      },
    });

    // Schedule retry (non-blocking, in-process).
    // NOTE: These retries are held in-process memory. A server restart will
    // silently drop all pending retries. The persisted nextRetryAt field is
    // stored for observability but is not currently used to recover retries
    // after a restart. A future improvement would be a DB-driven retry poller.
    setTimeout(() => {
      deliverWebhook(prisma, deliveryId, endpointUrl, encryptedSecret, payloadString).catch(
        () => {}, // Silently catch — delivery status is tracked in DB
      );
    }, delayMs);
  } else {
    // Exhausted all retries
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'failed',
        responseCode: statusCode,
        attempts: newAttempts,
        nextRetryAt: null,
        errorMessage: `Delivery failed permanently after ${newAttempts} attempts with status ${statusCode ?? 'network error'}`,
      },
    });
  }
}

/**
 * Dispatch a webhook event to all active endpoints for a given user.
 * Creates WebhookDelivery records and kicks off async delivery for each.
 *
 * @param prisma  - Prisma client instance
 * @param userId  - The user whose endpoints should be notified
 * @param event   - Event name, e.g. "card.viewed" or "contact.saved"
 * @param payload - Arbitrary JSON-serialisable payload object
 */
export async function dispatchWebhook(
  prisma: PrismaLike,
  userId: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // Find all active endpoints for this user that are subscribed to this event
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      userId,
      isActive: true,
      events: { has: event },
    },
  });

  if (endpoints.length === 0) {
    return;
  }

  const payloadString = JSON.stringify(payload);

  for (const endpoint of endpoints) {
    // Create a pending delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        eventType: event,
        payload,
        status: 'pending',
        attempts: 0,
      },
    });

    // Fire-and-forget delivery (non-blocking)
    deliverWebhook(prisma, delivery.id, endpoint.url, endpoint.secret, payloadString).catch(
      () => {}, // Errors are tracked in the delivery record
    );
  }
}
