import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

  try {
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/cards`);
    if (response.ok) {
      const cards = await response.json();
      return { cards };
    }
  } catch (err) {
    console.error('Failed to fetch cards from backend:', err);
  }

  // Fallback to empty list or mocks if backend is down
	return {
		cards: []
	};
};
