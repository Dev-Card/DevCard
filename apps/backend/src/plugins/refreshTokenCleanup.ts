import fp from 'fastify-plugin';

import { cleanupExpiredAndRevokedTokens } from '../services/refreshTokenCleanupService.js';

import type { FastifyInstance } from 'fastify';

export const refreshTokenCleanupPlugin = fp(async (app: FastifyInstance) => {
  // Read environment variable for interval configuration
  const intervalEnv = process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS;
  const defaultInterval = 86_400_000; // 24 hours in milliseconds
  let intervalMs = defaultInterval;

  if (intervalEnv !== undefined) {
    const parsed = Number(intervalEnv);

    if (Number.isFinite(parsed) && parsed > 0) {
      intervalMs = parsed;
    } else {
      app.log.warn(
        `Invalid REFRESH_TOKEN_CLEANUP_INTERVAL_MS value: "${intervalEnv}". Falling back to default: ${defaultInterval}ms`
      );
    }
  }

  // Execution function with try/catch and logging
  const runCleanup = async (): Promise<void> => {
    app.log.info('Starting automated refresh token cleanup...');
    try {
      const result = await cleanupExpiredAndRevokedTokens(app.prisma);
      app.log.info(
        {
          deletedCount: result.deletedCount,
          durationMs: result.durationMs,
        },
        'Refresh token cleanup completed'
      );
    } catch (error) {
      app.log.error({ err: error }, 'Automated refresh token cleanup failed');
    }
  };

  // 1. Startup cleanup attempt
  void runCleanup();

  // 2. Scheduled cleanup interval setup
  app.log.info(`Scheduling automated refresh token cleanup every ${intervalMs}ms`);
  const intervalId = setInterval(() => {
    // Run cleanup asynchronously
    void runCleanup();
  }, intervalMs);

  // 3. Graceful shutdown to avoid timer leaks
  app.addHook('onClose', async () => {
    clearInterval(intervalId);
    app.log.info('Automated refresh token cleanup scheduler stopped');
  });
});
