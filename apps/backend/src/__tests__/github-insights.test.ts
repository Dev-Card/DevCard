import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify from 'fastify';
import { githubInsightsRoutes } from '../routes/github-insights.js';

// ─── Mocks ───

const mockPrisma = {
  oAuthToken: {
    findUnique: vi.fn(),
  },
  gitHubInsightsCache: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
} as any;

// Stable encrypted token value (decrypt mock returns 'ghp_test_token')
const ENCRYPTED_TOKEN = 'encrypted_github_token';
const DECRYPTED_TOKEN = 'ghp_test_token';

// Mock encryption module
vi.mock('../utils/encryption.js', () => ({
  decrypt: vi.fn((val: string) => {
    if (val === ENCRYPTED_TOKEN) return DECRYPTED_TOKEN;
    throw new Error('Decryption failed');
  }),
}));

// ─── GitHub API mock responses ───

const mockGitHubUser = {
  login: 'octocat',
  public_repos: 3,
  followers: 100,
  following: 50,
  created_at: '2020-01-01T00:00:00Z',
};

const mockGitHubRepos = [
  {
    name: 'awesome-project',
    description: 'My best project',
    html_url: 'https://github.com/octocat/awesome-project',
    stargazers_count: 42,
    forks_count: 10,
    language: 'TypeScript',
    fork: false,
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    name: 'another-repo',
    description: null,
    html_url: 'https://github.com/octocat/another-repo',
    stargazers_count: 5,
    forks_count: 1,
    language: 'JavaScript',
    fork: false,
    updated_at: '2023-06-01T00:00:00Z',
  },
  {
    name: 'forked-repo',
    description: 'A fork',
    html_url: 'https://github.com/octocat/forked-repo',
    stargazers_count: 0,
    forks_count: 0,
    language: 'Python',
    fork: true,
    updated_at: '2023-01-01T00:00:00Z',
  },
];

// ─── App builder ───

async function buildApp() {
  const app = Fastify();

  app.decorate('prisma', mockPrisma);
  app.decorate('redis', mockRedis);
  app.decorate('authenticate', async (request: any) => {
    request.user = { id: 'user-123' };
  });

  app.register(githubInsightsRoutes, { prefix: '/api/analytics' });
  await app.ready();
  return app;
}

// ─── Tests ───

describe('GET /api/analytics/github-insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no cache
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.gitHubInsightsCache.findUnique.mockResolvedValue(null);
    mockPrisma.gitHubInsightsCache.upsert.mockResolvedValue({});
    mockRedis.set.mockResolvedValue('OK');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when GitHub is not connected', async () => {
    mockPrisma.oAuthToken.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('GitHub account not connected');
    expect(res.json().requiresAuth).toBe(true);
  });

  it('returns live insights when no cache exists', async () => {
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({
      accessToken: ENCRYPTED_TOKEN,
      scopes: 'read:user user:email',
    });

    // Mock GitHub API calls
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubRepos,
      }),
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.source).toBe('live');
    expect(body.username).toBe('octocat');
    expect(body.totalRepos).toBe(3);
    expect(body.followers).toBe(100);
    expect(body.primaryLanguage).toBe('TypeScript');
    expect(body.topRepos).toHaveLength(2); // forked repo excluded
    expect(body.topRepos[0].name).toBe('awesome-project');
    expect(body.topRepos[0].stars).toBe(42);
    expect(body.totalStars).toBe(47); // 42 + 5 (fork excluded)
    expect(body.languageStats).toHaveLength(2); // TypeScript + JavaScript (fork excluded)
    expect(body.fetchedAt).toBeDefined();
  });

  it('returns cached data from Redis when available', async () => {
    const cachedInsights = {
      username: 'octocat',
      totalRepos: 3,
      totalStars: 47,
      totalForks: 11,
      followers: 100,
      following: 50,
      topRepos: [],
      languageStats: [],
      primaryLanguage: 'TypeScript',
      accountCreatedAt: '2020-01-01T00:00:00Z',
      fetchedAt: new Date().toISOString(),
      aiSummary: null,
    };

    mockRedis.get.mockResolvedValue(JSON.stringify(cachedInsights));

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe('cache');
    expect(body.username).toBe('octocat');
    // GitHub API should NOT have been called
    expect(mockPrisma.oAuthToken.findUnique).not.toHaveBeenCalled();
  });

  it('returns cached data from DB when Redis misses', async () => {
    mockRedis.get.mockResolvedValue(null);

    const cachedInsights = {
      username: 'octocat',
      totalRepos: 3,
      totalStars: 47,
      totalForks: 11,
      followers: 100,
      following: 50,
      topRepos: [],
      languageStats: [],
      primaryLanguage: 'TypeScript',
      accountCreatedAt: '2020-01-01T00:00:00Z',
      fetchedAt: new Date().toISOString(),
      aiSummary: null,
    };

    mockPrisma.gitHubInsightsCache.findUnique.mockResolvedValue({
      userId: 'user-123',
      payload: cachedInsights,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.source).toBe('cache');
    expect(body.username).toBe('octocat');
    // Redis should have been warmed up
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it('bypasses cache when ?refresh=true', async () => {
    // Even with Redis data present, should fetch fresh
    mockRedis.get.mockResolvedValue(JSON.stringify({ username: 'stale' }));

    mockPrisma.oAuthToken.findUnique.mockResolvedValue({
      accessToken: ENCRYPTED_TOKEN,
      scopes: 'read:user user:email',
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubUser })
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubRepos }),
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights?refresh=true',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().source).toBe('live');
    expect(res.json().username).toBe('octocat');
  });

  it('returns 401 when GitHub token is expired', async () => {
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({
      accessToken: ENCRYPTED_TOKEN,
      scopes: 'read:user',
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' }),
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().requiresAuth).toBe(true);
  });

  it('correctly excludes forked repos from star and language counts', async () => {
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({
      accessToken: ENCRYPTED_TOKEN,
      scopes: 'read:user',
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubUser })
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubRepos }),
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    const body = res.json();
    // Python only appears in the forked repo — should not be in languageStats
    const pythonStat = body.languageStats.find((l: any) => l.language === 'Python');
    expect(pythonStat).toBeUndefined();
    // forked-repo should not appear in topRepos
    const forkedRepo = body.topRepos.find((r: any) => r.name === 'forked-repo');
    expect(forkedRepo).toBeUndefined();
  });

  it('sets statsAreCapped=true when user has more than 200 repos', async () => {
    const heavyUser = { ...mockGitHubUser, public_repos: 250 };

    mockPrisma.oAuthToken.findUnique.mockResolvedValue({
      accessToken: ENCRYPTED_TOKEN,
      scopes: 'read:user',
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => heavyUser })
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubRepos })
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubRepos }), // page 2
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().statsAreCapped).toBe(true);
  });

  it('sets statsAreCapped=false when user has 200 or fewer repos', async () => {
    mockPrisma.oAuthToken.findUnique.mockResolvedValue({
      accessToken: ENCRYPTED_TOKEN,
      scopes: 'read:user',
    });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubUser }) // public_repos: 3
      .mockResolvedValueOnce({ ok: true, json: async () => mockGitHubRepos }),
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/github-insights',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().statsAreCapped).toBe(false);
  });
});
