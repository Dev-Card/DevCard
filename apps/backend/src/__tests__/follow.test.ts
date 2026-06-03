import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { followRoutes } from '../routes/follow.js';

vi.mock('../utils/encryption.js', () => ({
  decrypt: vi.fn(() => 'fake-access-token'),
}));

describe('POST /api/follow/:platform/:targetUsername', () => {
  it('returns 400 when API follow is not supported for the platform', async () => {
    const app = Fastify({ logger: false });

    const findUnique = vi.fn().mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      platform: 'unknown',
      accessToken: 'encrypted-token',
    });

    app.decorate('prisma', {
      oAuthToken: {
        findUnique,
      },
      followLog: {
        create: vi.fn(),
      },
    }as any);

    app.decorate('authenticate', async (request: any) => {
      request.user = { id: 'user-1' };
    });

    await app.register(followRoutes, { prefix: '/api/follow' });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/follow/unknown/targetUser',
    });

    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error).toContain('API follow not supported');
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userId_platform: {
          userId: 'user-1',
          platform: 'unknown',
        },
      },
    });

    await app.close();
  });
});