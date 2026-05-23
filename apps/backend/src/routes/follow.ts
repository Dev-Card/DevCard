import { getPlatform, getProfileUrl, getWebViewUrl } from '@devcard/shared';

import { decrypt } from '../utils/encryption.js';
import { getErrorMessage, logBackgroundError } from '../utils/error.util.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';


export async function followRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/:platform/:targetUsername', async (
    request: FastifyRequest<{ Params: { platform: string; targetUsername: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as { id: string }).id;
    const { platform, targetUsername } = request.params;

    const platformDef = getPlatform(platform);
    if (platformDef?.followStrategy === 'webview') {
      const url = getWebViewUrl(platform, targetUsername) || getProfileUrl(platform, targetUsername);
      return reply.send({
        strategy: 'webview',
        url,
      });
    }

    const oauthToken = await app.prisma.oAuthToken.findUnique({
      where: {
        userId_platform: { userId, platform },
      },
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
        app.prisma.followLog
          .create({
            data: {
              followerId: userId,
              targetUsername,
              platform,
              status: 'success',
              layer: 'api',
            },
          })
          .catch((err: unknown) => logBackgroundError(app.log, err, 'Failed to log follow'));
      }

      return result.response;
    } catch (err: unknown) {
      app.log.error(`Follow error for ${platform}: ${getErrorMessage(err)}`);

      app.prisma.followLog
        .create({
          data: {
            followerId: userId,
            targetUsername,
            platform,
            status: 'error',
            layer: 'api',
          },
        })
        .catch((logErr: unknown) => logBackgroundError(app.log, logErr, 'Failed to log follow error'));

      return reply.status(500).send({
        error: 'Follow action failed',
        message: getErrorMessage(err),
      });
    }
  });

  app.post('/:platform/:targetUsername/log', async (
    request: FastifyRequest<{
      Params: { platform: string; targetUsername: string };
      Body: { status?: string; layer?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as { id: string }).id;
    const { platform, targetUsername } = request.params;
    const { status = 'success', layer = 'webview' } = request.body || {};

    try {
      const log = await app.prisma.followLog.create({
        data: {
          followerId: userId,
          targetUsername,
          platform,
          status,
          layer,
        },
      });
      return reply.send({ status: 'success', logId: log.id });
    } catch (err: unknown) {
      app.log.error(`Failed to log follow event: ${getErrorMessage(err)}`);
      return reply.status(500).send({ error: 'Failed to log follow event' });
    }
  });

  app.delete('/:platform/:targetUsername/log', async (
    request: FastifyRequest<{ Params: { platform: string; targetUsername: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as { id: string }).id;
    const { platform, targetUsername } = request.params;

    await app.prisma.followLog.deleteMany({
      where: {
        followerId: userId,
        platform,
        targetUsername,
      },
    });

    return reply.send({ status: 'cleared' });
  });
}

async function followGitHub(
  accessToken: string,
  targetUsername: string,
  reply: FastifyReply,
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
      response: reply.status(404).send({
        error: `GitHub user '${targetUsername}' not found`,
      }),
    };
  }

  const errorBody = await response.text();
  return {
    success: false,
    response: reply.status(response.status).send({
      error: 'GitHub follow failed',
      details: errorBody,
    }),
  };
}
