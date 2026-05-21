import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${API_BASE}/api/u/${params.username}?source=web`);
    if (!res.ok) {
      return {
        profile: null,
        error: 'User not found',
        publicAppUrl,
        backendUrl,
      };
    }
    const profile = await res.json();
    return {
      profile,
      error: null,
      publicAppUrl,
      backendUrl,
    };
  } catch {
    return {
      profile: null,
      error: 'Failed to load profile',
      publicAppUrl,
      backendUrl,
    };
  }
};
