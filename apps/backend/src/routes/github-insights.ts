import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { decrypt } from '../utils/encryption.js';
import type {
  GitHubInsights,
  GitHubRepo,
  GitHubLanguageStat,
} from '@devcard/shared';

// ─── Constants ───

const GITHUB_API = 'https://api.github.com';
/** Cache TTL: 1 hour in seconds (Redis) and milliseconds (DB) */
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
const REDIS_KEY_PREFIX = 'github_insights:';
/**
 * Maximum repos fetched for analysis (2 pages × 100).
 *
 * ⚠️  KNOWN LIMITATION: For users with more than 200 public repos,
 * `totalStars`, `totalForks`, and `languageStats` are computed from
 * the most-recently-updated 200 repos only, while `totalRepos` always
 * reflects the full count from the GitHub user profile.
 * These fields are therefore marked as estimates when the cap is hit —
 * see `statsAreCapped` in the response.
 */
const MAX_REPOS_PAGES = 2;
const REPOS_PER_PAGE = 100;
const MAX_REPOS_FOR_ANALYSIS = MAX_REPOS_PAGES * REPOS_PER_PAGE;
/** Top repos to surface in the response */
const TOP_REPOS_COUNT = 5;

// ─── Route ───

export async function githubInsightsRoutes(app: FastifyInstance) {
  /**
   * GET /api/analytics/github-insights
   *
   * Returns AI-enriched GitHub activity insights for the authenticated user.
   * Requires the user to have a connected GitHub OAuth token.
   *
   * Cache strategy (two layers):
   *   1. Redis  — fast in-memory, TTL 1 hour
   *   2. DB     — fallback if Redis is unavailable, TTL 1 hour
   *
   * Query params:
   *   ?refresh=true  — bypass cache and force a fresh fetch
   */
  app.get('/github-insights', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest<{ Querystring: { refresh?: string } }>, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const forceRefresh = request.query.refresh === 'true';

    // ── 1. Check Redis cache ──
    if (!forceRefresh) {
      const cached = await getCachedFromRedis(app, userId);
      if (cached) {
        return reply.send({ ...cached, source: 'cache' });
      }
    }

    // ── 2. Check DB cache ──
    if (!forceRefresh) {
      const dbCached = await getCachedFromDb(app, userId);
      if (dbCached) {
        // Warm Redis back up
        await setCachedInRedis(app, userId, dbCached);
        return reply.send({ ...dbCached, source: 'cache' });
      }
    }

    // ── 3. Fetch GitHub OAuth token ──
    const oauthToken = await app.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'github' } },
    });

    if (!oauthToken) {
      return reply.status(400).send({
        error: 'GitHub account not connected',
        message: 'Connect your GitHub account to view insights.',
        requiresAuth: true,
      });
    }

    let accessToken: string;
    try {
      accessToken = decrypt(oauthToken.accessToken);
    } catch {
      return reply.status(500).send({ error: 'Failed to decrypt GitHub token' });
    }

    // ── 4. Fetch data from GitHub API ──
    try {
      const insights = await buildInsights(accessToken);

      // ── 5. Generate AI summary (optional — only if key is configured) ──
      insights.aiSummary = await generateAiSummary(insights);

      // ── 6. Persist to both caches ──
      await Promise.all([
        setCachedInRedis(app, userId, insights),
        upsertCachedInDb(app, userId, insights),
      ]);

      return reply.send({ ...insights, source: 'live' });
    } catch (err: any) {
      app.log.error('GitHub insights fetch error:', err);

      if (err.status === 401 || err.status === 403) {
        return reply.status(401).send({
          error: 'GitHub token expired or insufficient permissions',
          requiresAuth: true,
        });
      }

      return reply.status(502).send({
        error: 'Failed to fetch GitHub data',
        message: err.message,
      });
    }
  });
}

// ─── GitHub Data Fetching ───

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    const err: any = new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

async function buildInsights(accessToken: string): Promise<GitHubInsights> {
  // Fetch user profile and first page of repos in parallel
  const [ghUser, firstPageRepos] = await Promise.all([
    githubFetch<any>('/user', accessToken),
    githubFetch<any[]>(
      `/user/repos?per_page=${REPOS_PER_PAGE}&sort=updated&type=owner&page=1`,
      accessToken,
    ),
  ]);

  let allRepos = firstPageRepos;
  let statsAreCapped = false;

  // Fetch second page if the user has more than one page of repos
  if (ghUser.public_repos > REPOS_PER_PAGE) {
    try {
      const secondPage = await githubFetch<any[]>(
        `/user/repos?per_page=${REPOS_PER_PAGE}&sort=updated&type=owner&page=2`,
        accessToken,
      );
      allRepos = [...firstPageRepos, ...secondPage];
    } catch {
      // Non-fatal — proceed with what we have
    }

    // If the user has more repos than our cap, flag it so the client
    // can surface a disclaimer ("stats based on most recent 200 repos")
    if (ghUser.public_repos > MAX_REPOS_FOR_ANALYSIS) {
      statsAreCapped = true;
    }
  }

  // ── Language aggregation (own repos only, forks excluded) ──
  const languageBytes: Record<string, number> = {};
  for (const repo of allRepos) {
    if (repo.language && !repo.fork) {
      languageBytes[repo.language] = (languageBytes[repo.language] ?? 0) + 1;
    }
  }

  const totalLangCount = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  const languageStats: GitHubLanguageStat[] = Object.entries(languageBytes)
    .sort(([, a], [, b]) => b - a)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: totalLangCount > 0
        ? Math.round((bytes / totalLangCount) * 1000) / 10
        : 0,
    }));

  // ── Top repos by stars (own repos only, forks excluded) ──
  const ownRepos = allRepos.filter((r) => !r.fork);

  const topRepos: GitHubRepo[] = ownRepos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, TOP_REPOS_COUNT)
    .map((r) => ({
      name: r.name,
      description: r.description ?? null,
      url: r.html_url,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language ?? null,
      isForked: r.fork,
      updatedAt: r.updated_at,
    }));

  // ── Aggregate totals (own repos only, forks excluded) ──
  const totalStars = ownRepos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const totalForks = ownRepos.reduce((sum, r) => sum + r.forks_count, 0);

  return {
    username: ghUser.login,
    totalRepos: ghUser.public_repos,
    totalStars,
    totalForks,
    followers: ghUser.followers,
    following: ghUser.following,
    topRepos,
    languageStats,
    primaryLanguage: languageStats[0]?.language ?? null,
    accountCreatedAt: ghUser.created_at,
    fetchedAt: new Date().toISOString(),
    aiSummary: null, // filled in after
    statsAreCapped,
  };
}

// ─── AI Summary (Gemini) ───

async function generateAiSummary(insights: GitHubInsights): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const topLangs = insights.languageStats
    .slice(0, 3)
    .map((l) => `${l.language} (${l.percentage}%)`)
    .join(', ');

  const topRepoNames = insights.topRepos
    .slice(0, 3)
    .map((r) => `${r.name} (⭐${r.stars})`)
    .join(', ');

  const prompt = [
    `You are a developer profile analyst. Write a concise 2-sentence professional summary for a GitHub developer.`,
    `Be specific, factual, and encouraging. Do not use generic filler phrases.`,
    ``,
    `Developer stats:`,
    `- Username: ${insights.username}`,
    `- Public repos: ${insights.totalRepos}`,
    `- Total stars earned: ${insights.totalStars}`,
    `- Followers: ${insights.followers}`,
    `- Primary languages: ${topLangs || 'not available'}`,
    `- Top repositories: ${topRepoNames || 'none'}`,
    `- GitHub member since: ${new Date(insights.accountCreatedAt).getFullYear()}`,
  ].join('\n');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
        }),
      },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as any;
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return text?.trim() ?? null;
  } catch {
    // AI is optional — never fail the whole request because of it
    return null;
  }
}

// ─── Cache Helpers ───

function redisKey(userId: string): string {
  return `${REDIS_KEY_PREFIX}${userId}`;
}

async function getCachedFromRedis(
  app: FastifyInstance,
  userId: string,
): Promise<GitHubInsights | null> {
  try {
    const raw = await app.redis.get(redisKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as GitHubInsights;
  } catch {
    return null;
  }
}

async function setCachedInRedis(
  app: FastifyInstance,
  userId: string,
  insights: GitHubInsights,
): Promise<void> {
  try {
    await app.redis.set(
      redisKey(userId),
      JSON.stringify(insights),
      'EX',
      CACHE_TTL_SECONDS,
    );
  } catch {
    // Redis is optional
  }
}

async function getCachedFromDb(
  app: FastifyInstance,
  userId: string,
): Promise<GitHubInsights | null> {
  try {
    const row = await app.prisma.gitHubInsightsCache.findUnique({
      where: { userId },
    });
    if (!row) return null;
    if (new Date(row.expiresAt) < new Date()) return null;
    return row.payload as unknown as GitHubInsights;
  } catch {
    return null;
  }
}

async function upsertCachedInDb(
  app: FastifyInstance,
  userId: string,
  insights: GitHubInsights,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    await app.prisma.gitHubInsightsCache.upsert({
      where: { userId },
      update: { payload: insights as any, expiresAt },
      create: { userId, payload: insights as any, expiresAt },
    });
  } catch {
    // DB cache is best-effort
  }
}
