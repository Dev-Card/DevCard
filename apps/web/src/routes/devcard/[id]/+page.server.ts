import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	const apiUrl = import.meta.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:3000';
	const res = await fetch(`${apiUrl}/api/u/card/${id}`);

	if (!res.ok) {
		throw error(404, 'Card not found');
	}

	const card = await res.json();
	return { card };
};
