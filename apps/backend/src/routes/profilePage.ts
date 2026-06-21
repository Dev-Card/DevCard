import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as publicService from '../services/publicService.js';

import type { PublicProfile } from '@devcard/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST_DIR = path.resolve(__dirname, '../../web/dist');
const WEB_INDEX_PATH = path.join(WEB_DIST_DIR, 'index.html');
const DEFAULT_DESCRIPTION =
  'One Tap. Every Profile. Every Platform. Open Source Developer Profile Exchange Platform.';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(baseUrl: string, pathname: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}${pathname}`;
}

function buildMetaDescription(profile: PublicProfile): string {
  const platformCount = profile.links.length;
  const platformSummary = platformCount === 1 ? '1 platform' : `${platformCount} platforms`;

  if (profile.bio) {
    return `${profile.bio} ${platformSummary} connected on DevCard.`;
  }

  return `${profile.displayName}'s developer profile with ${platformSummary} connected on DevCard.`;
}

function buildProfileMeta(profile: PublicProfile): string {
  const appBaseUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
  const apiBaseUrl = process.env.PUBLIC_API_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3000';
  const canonicalUrl = absoluteUrl(appBaseUrl, `/u/${encodeURIComponent(profile.username)}`);
  const ogImageUrl = absoluteUrl(apiBaseUrl, `/api/u/${encodeURIComponent(profile.username)}/og-image`);
  const title = `${profile.displayName} | DevCard`;
  const description = buildMetaDescription(profile);

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    '<meta property="og:type" content="profile" />',
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:site_name" content="DevCard" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:site" content="@devcard" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`,
  ].join('\n    ');
}

async function readWebIndex(): Promise<string> {
  try {
    return await fs.readFile(WEB_INDEX_PATH, 'utf8');
  } catch {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${DEFAULT_DESCRIPTION}" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }
}

function injectProfileMeta(indexHtml: string, metaHtml: string): string {
  const htmlWithoutTitle = indexHtml.replace(/<title>[\s\S]*?<\/title>/i, '');
  const htmlWithoutDescription = htmlWithoutTitle.replace(
    /<meta\s+name=["']description["'][^>]*>\s*/i,
    '',
  );

  if (htmlWithoutDescription.includes('</head>')) {
    return htmlWithoutDescription.replace('</head>', `    ${metaHtml}\n  </head>`);
  }

  return `<!doctype html><html lang="en"><head>${metaHtml}</head><body><div id="root"></div></body></html>`;
}

export async function profilePageRoutes(app: FastifyInstance): Promise<void> {
  app.get('/u/:username', async (
    request: FastifyRequest<{ Params: { username: string } }>,
    reply: FastifyReply,
  ) => {
    const { username } = request.params;
    const result = await publicService.getPublicProfile(app, username, null, request);

    if (!result) {
      return reply.status(404).type('text/html').send(
        '<!doctype html><html lang="en"><head><title>User Not Found | DevCard</title></head><body><div id="root"></div></body></html>',
      );
    }

    const indexHtml = await readWebIndex();
    const html = injectProfileMeta(indexHtml, buildProfileMeta(result.data as PublicProfile));

    return reply
      .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
      .type('text/html')
      .send(html);
  });
}
