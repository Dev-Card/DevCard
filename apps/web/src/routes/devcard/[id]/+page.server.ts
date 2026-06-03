import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	// Use internal fetch to reach the backend
	// In production, this would be the actual API URL
	const res = await fetch(`http://localhost:3000/api/u/card/${id}`);

	if (!res.ok) {
		throw error(404, 'Card not found');
	}

	const card = await res.json();
	return { card };
};
