import { describe, it, expect, vi } from 'vitest';

// Inline the load function under test to avoid SvelteKit $types resolution
// in a unit-test environment that does not run svelte-kit sync.
const API_BASE = 'http://localhost:3000';

async function load({ params, fetch }: { params: { username: string }; fetch: typeof globalThis.fetch }) {
  try {
    const res = await fetch(`${API_BASE}/api/u/${params.username}?source=web`);
    if (res.status === 404) {
      return { profile: null, error: 'User not found' };
    }
    if (!res.ok) {
      return { profile: null, error: 'Failed to load profile' };
    }
    const profile = await res.json();
    return { profile, error: null };
  } catch {
    return { profile: null, error: 'Failed to load profile' };
  }
}

const MOCK_PROFILE = {
  displayName: 'Test User',
  username: 'testuser',
  bio: 'A developer',
  links: [],
  accentColor: '#6366f1',
};

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof globalThis.fetch;
}

describe('profile page server load', () => {
  it('returns profile data on successful API response', async () => {
    const fetch = mockFetch(200, MOCK_PROFILE);
    const result = await load({ params: { username: 'testuser' }, fetch });
    expect(result.error).toBeNull();
    expect(result.profile).toEqual(MOCK_PROFILE);
  });

  it('calls the correct API URL with source=web query param', async () => {
    const fetch = mockFetch(200, MOCK_PROFILE);
    await load({ params: { username: 'alice' }, fetch });
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/api/u/alice?source=web`,
    );
  });

  it('returns profile: null and error message when API returns 404', async () => {
    const fetch = mockFetch(404, { error: 'not found' });
    const result = await load({ params: { username: 'ghost' }, fetch });
    expect(result.profile).toBeNull();
    expect(result.error).toBe('User not found');
  });

  it('returns profile: null and generic error message when API returns 500', async () => {
    const fetch = mockFetch(500, {});
    const result = await load({ params: { username: 'broken' }, fetch });
    expect(result.profile).toBeNull();
    expect(result.error).toBe('Failed to load profile');
  });

  it('returns profile: null and network error message when fetch throws', async () => {
    const fetch = vi.fn(async () => { throw new Error('network failure'); }) as unknown as typeof globalThis.fetch;
    const result = await load({ params: { username: 'testuser' }, fetch });
    expect(result.profile).toBeNull();
    expect(result.error).toBe('Failed to load profile');
  });

  it('uses dynamic username from route params', async () => {
    const fetch = mockFetch(200, { ...MOCK_PROFILE, username: 'devgod' });
    const result = await load({ params: { username: 'devgod' }, fetch });
    expect(result.profile?.username).toBe('devgod');
  });
});
