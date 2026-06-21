import type { PrismaClient } from '@prisma/client';

export interface CleanupResult {
  deletedCount: number;
  durationMs: number;
}

/**
 * Clean up expired and revoked refresh tokens from the database.
 * Deletes where revokedAt is not null OR expiresAt has passed.
 * Active tokens (revokedAt is null AND expiresAt is in the future) are not deleted.
 */
export async function cleanupExpiredAndRevokedTokens(
  prisma: PrismaClient
): Promise<CleanupResult> {
  const startTime = Date.now();
  const now = new Date();

  // Perform deleteMany directly to avoid pre-fetching rows
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { revokedAt: { not: null } },
        { expiresAt: { lt: now } },
      ],
    },
  });

  const durationMs = Date.now() - startTime;

  return {
    deletedCount: result.count,
    durationMs,
  };
}
