import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const res = await fetch(`${API_BASE}/api/u/${params.username}`);
    if (!res.ok) {
      return { profile: null, error: 'User not found' };
    }
    const profile = await res.json();
    return { profile, error: null };
  } catch {
    return { profile: null, error: 'Failed to load profile' };
  }
};
