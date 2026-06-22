import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { profilePageRoutes } from '../routes/profilePage.js';

vi.mock('../services/publicService.js', () => ({
  getPublicProfile: vi.fn(),
}));

const { getPublicProfile } = await import('../services/publicService.js');

const mockProfile = {
  username: 'testuser',
  displayName: 'Test User',
  bio: 'Building <cool> things.',
  pronouns: null,
  role: null,
  company: null,
  avatarUrl: null,
  accentColor: '#6366f1',
  links: [
    {
      id: 'link-1',
      platform: 'github',
      username: 'testuser',
      url: 'https://github.com/testuser',
      displayOrder: 0,
    },
  ],
};

async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify();
  app.register(profilePageRoutes);
  await app.ready();
  return app;
}

describe('GET /u/:username — server-rendered profile metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_APP_URL = 'https://devcard.example';
    process.env.PUBLIC_API_URL = 'https://api.devcard.example';
  });

  it('renders crawler-readable Open Graph and Twitter tags in the initial HTML', async () => {
    (getPublicProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      cached: false,
      data: mockProfile,
      cacheKey: 'profile:testuser',
    });
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/u/testuser' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain('<title>Test User | DevCard</title>');
    expect(res.body).toContain(
      '<meta property="og:image" content="https://api.devcard.example/api/u/testuser/og-image" />',
    );
    expect(res.body).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(res.body).toContain('Building &lt;cool&gt; things. 1 platform connected on DevCard.');
  });

  it('returns a crawler-readable 404 shell when the profile is missing', async () => {
    (getPublicProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/u/nobody' });

    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain('<title>User Not Found | DevCard</title>');
  });
});
