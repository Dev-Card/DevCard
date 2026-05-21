import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ request }) => {
  const cookie = request.headers.get('cookie') || '';

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { cookie },
    });

    if (!res.ok) {
      throw new Error('Not authenticated');
    }

    const user = await res.json();
    return { user, backendUrl: API_BASE };
  } catch {
    throw redirect(302, '/login');
  }
};
