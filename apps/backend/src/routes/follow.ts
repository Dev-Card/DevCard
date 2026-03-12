import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { decrypt } from '../utils/encryption.js';

export async function followRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // ─── Follow via API (Layer 1) ───
  // Currently supports: GitHub

  app.post('/:platform/:targetUsername', async (
    request: FastifyRequest<{ Params: { platform: string; targetUsername: string } }>,
    reply: FastifyReply
  ) => {
    const userId = (request.user as any).id;
    const { platform, targetUsername } = request.params;

    // Get stored OAuth token for this platform
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

    // Decrypt the stored token
    const accessToken = decrypt(oauthToken.accessToken);

    try {
      switch (platform) {
        case 'github':
          return await followGitHub(accessToken, targetUsername, reply);

        default:
          return reply.status(400).send({
            error: `API follow not supported for ${platform}. Use WebView or link instead.`,
          });
      }
    } catch (err: any) {
      app.log.error(`Follow error for ${platform}:`, err);
      return reply.status(500).send({ error: 'Follow action failed', message: err.message });
    }
  });
}

// ─── GitHub Follow (Layer 1) ───

async function followGitHub(
  accessToken: string,
  targetUsername: string,
  reply: FastifyReply
) {
  const response = await fetch(`https://api.github.com/user/following/${targetUsername}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Length': '0',
    },
  });

  if (response.status === 204) {
    return reply.send({
      status: 'success',
      platform: 'github',
      targetUsername,
      message: `Now following ${targetUsername} on GitHub`,
    });
  }

  if (response.status === 401 || response.status === 403) {
    return reply.status(401).send({
      error: 'GitHub token expired or insufficient permissions',
      requiresAuth: true,
    });
  }

  if (response.status === 404) {
    return reply.status(404).send({
      error: `GitHub user '${targetUsername}' not found`,
    });
  }

  const errorBody = await response.text();
  return reply.status(response.status).send({
    error: 'GitHub follow failed',
    details: errorBody,
  });
}
