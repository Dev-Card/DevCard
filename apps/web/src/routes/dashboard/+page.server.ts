import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

  try {
    // We call the backend directly from the server
    const response = await fetch('http://localhost:3000/api/cards');
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
