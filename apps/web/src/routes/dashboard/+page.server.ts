import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get('token');
  if (!token) {
    throw redirect(302, '/login');
  }

  try {
    const res = await fetch(`${API_BASE}/api/profiles/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      // Token is invalid or expired, clear and redirect
      cookies.delete('token', { path: '/' });
      throw redirect(302, '/login');
    }

    const user = await res.json();
    return { user };
  } catch (err: any) {
    // If the error is a SvelteKit redirect instruction, forward it
    if (err.status && err.status >= 300 && err.status < 400) {
      throw err;
    }
    
    return {
      user: null,
      error: 'Backend API is currently unreachable. Please make sure the backend server is running.',
    };
  }
};
