import { z } from 'zod';

/**
 * Strict allowlist schema for analytics-impacting follow log fields.
 *
 * Both `status` and `layer` feed directly into analytics counters and the
 * follower-state dashboard.  Only the values enumerated below may be
 * persisted — all other values are rejected before any database write.
 *
 * status:
 *   'success' — the follow action completed and was accepted by the platform
 *   'failed'  — the action completed but was rejected (e.g. rate-limit, block)
 *   'pending' — the action was initiated; outcome not yet confirmed by client
 *
 * layer (hybrid follow engine interaction surface):
 *   'foreground' — user interacted directly with an in-app WebView session
 *   'background' — follow triggered through a passive deep-link / redirect strategy
 */
export const followLogSchema = z.object({
  status: z.enum(['success', 'failed', 'pending'], {
    errorMap: () => ({
      message: "status must be one of: 'success', 'failed', 'pending'",
    }),
  }),
  layer: z.enum(['foreground', 'background'], {
    errorMap: () => ({
      message: "layer must be one of: 'foreground', 'background'",
    }),
  }),
});

export type FollowLogBody = z.infer<typeof followLogSchema>;
