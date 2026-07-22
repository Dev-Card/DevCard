import { describe, it, expect, vi } from 'vitest';

import { recordConnectionEvent } from '../services/streakService';

import type { FastifyInstance } from 'fastify';

describe('streakService', () => {
  it('should enforce privacy rule: anonymous connections never write a receiver_id', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'test-event' });
    const mockApp = {
      prisma: {
        connectionEvent: {
          create: mockCreate,
        },
      },
    } as unknown as FastifyInstance;

    // Test with signed in and consented (should store receiverId)
    await recordConnectionEvent(mockApp, 'initiator-1', 'receiver-1', true);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        initiatorId: 'initiator-1',
        receiverId: 'receiver-1',
      },
    });

    // Test with anonymous/not consented (should store null for receiverId)
    await recordConnectionEvent(mockApp, 'initiator-1', 'receiver-1', false);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        initiatorId: 'initiator-1',
        receiverId: null,
      },
    });
  });
});
