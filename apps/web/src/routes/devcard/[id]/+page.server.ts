import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { id } = params;

	try {
		const res = await fetch(`${API_BASE}/api/u/card/${id}`);

		if (res.status === 404) {
			throw error(404, 'Card not found');
		}

		if (!res.ok) {
			throw error(500, 'Failed to load card');
		}

		const card = await res.json();
		return { card };
	} catch (err: unknown) {
		// Type guard for SvelteKit error objects
		if (isHttpError(err)) {
			throw err;
		}
		// Use a different variable name to avoid collision with imported 'error' function
		const httpError = error(500, 'Failed to connect to backend');
		throw httpError;
	}
};
