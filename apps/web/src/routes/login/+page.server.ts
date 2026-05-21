import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ request }) => {
  const cookie = request.headers.get('cookie') || '';
  let user: Record<string, unknown> | null = null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { cookie },
    });
    if (res.ok) {
      user = await res.json();
    }
  } catch {
    // not authenticated
  }

  return {
    backendUrl: API_BASE,
    user,
  };
};
