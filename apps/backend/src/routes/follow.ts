/**
 * routes/follow.ts  (updated)
 *
 * Rate limit changes:
 *  - POST /:platform/:targetUsername     → MODERATE (authenticated follow action)
 *  - POST /:platform/:targetUsername/log → MODERATE (analytics write)
 *  - DELETE /:platform/:targetUsername/log → MODERATE (state mutation)
 *
 * No business logic modified.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { decrypt } from '../utils/encryption.js';
import { getPlatform, getProfileUrl, getWebViewUrl } from '@devcard/shared';
import { moderateRateLimit } from '../plugins/rate-limit.js';

export async function followRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // ─── Follow via API ───
  app.post('/:platform/:targetUsername', moderateRateLimit, async (
    request: FastifyRequest<{ Params: { platform: string; targetUsername: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { platform, targetUsername } = request.params;

    const platformDef = getPlatform(platform);
    if (platformDef?.followStrategy === 'webview') {
      const url = getWebViewUrl(platform, targetUsername) || getProfileUrl(platform, targetUsername);
      return reply.send({ strategy: 'webview', url });
    }

    const oauthToken = await app.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform } },
    });

    if (!oauthToken) {
      return reply.status(400).send({
        error: `Not connected to ${platform}. Please connect your ${platform} account first.`,
        requiresAuth: true,
      });
    }

    const accessToken = decrypt(oauthToken.accessToken);

    try {
      let result;
      let succeeded = false;

      switch (platform) {
        case 'github':
          result = await followGitHub(accessToken, targetUsername, reply);
          succeeded = result.success === true;
          break;
        default:
          return reply.status(400).send({
            error: `API follow not supported for ${platform}. Use WebView or link instead.`,
          });
      }

      if (succeeded) {
        app.prisma.followLog.create({
          data: { followerId: userId, targetUsername, platform, status: 'success', layer: 'api' },
        }).catch((err) => app.log.error('Failed to log follow:', err));
      }

      return result.response;
    } catch (err: any) {
      app.log.error(`Follow error for ${platform}:`, err);
      app.prisma.followLog.create({
        data: { followerId: userId, targetUsername, platform, status: 'error', layer: 'api' },
      }).catch((e) => app.log.error('Failed to log follow error:', e));
      return reply.status(500).send({ error: 'Follow action failed', message: err.message });
    }
  });

  // ─── Log follow event (Layer 2/3) ───
  app.post('/:platform/:targetUsername/log', moderateRateLimit, async (
    request: FastifyRequest<{
      Params: { platform: string; targetUsername: string };
      Body: { status?: string; layer?: string };
    }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { platform, targetUsername } = request.params;

    const parsed = followLogSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid follow log payload' });
    }

    const { status, layer } = parsed.data;

    try {
      const log = await app.prisma.followLog.create({
        data: { followerId: userId, targetUsername, platform, status, layer },
      });
      return reply.send({ status: 'success', logId: log.id });
    } catch (err: any) {
      app.log.error('Failed to log follow:', err);
      return reply.status(500).send({ error: 'Failed to log follow event' });
    }
  });

  // ─── Clear follow log ───
  app.delete('/:platform/:targetUsername/log', moderateRateLimit, async (
    request: FastifyRequest<{ Params: { platform: string; targetUsername: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { platform, targetUsername } = request.params;

    await app.prisma.followLog.deleteMany({
      where: { followerId: userId, platform, targetUsername },
    });

    return reply.send({ status: 'cleared' });
  });
}

// ─── GitHub Follow ───
async function followGitHub(
  accessToken: string,
  targetUsername: string,
  reply: FastifyReply
): Promise<{ success: boolean; response: FastifyReply }> {
  const response = await fetch(`https://api.github.com/user/following/${targetUsername}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Length': '0',
    },
  });

  if (response.status === 204) {
    return {
      success: true,
      response: reply.send({
        status: 'success',
        platform: 'github',
        targetUsername,
        message: `Now following ${targetUsername} on GitHub`,
      }),
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      success: false,
      response: reply.status(401).send({
        error: 'GitHub token expired or insufficient permissions',
        requiresAuth: true,
      }),
    };
  }

  if (response.status === 404) {
    return {
      success: false,
      response: reply.status(404).send({ error: `GitHub user '${targetUsername}' not found` }),
    };
  }

  const errorBody = await response.text();
  return {
    success: false,
    response: reply.status(response.status).send({ error: 'GitHub follow failed', details: errorBody }),
  };
}
