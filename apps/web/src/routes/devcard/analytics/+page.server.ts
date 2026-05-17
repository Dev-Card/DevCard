import type { PageServerLoad } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const load: PageServerLoad = async ({ fetch, request }) => {
	try {
		const cookie = request.headers.get('cookie') || '';
		const headers = { cookie };
		const [overviewRes, viewsRes] = await Promise.all([
			fetch(`${API_BASE}/api/analytics/overview`, { headers }),
			fetch(`${API_BASE}/api/analytics/views`, { headers })
		]);

		if (!overviewRes.ok || !viewsRes.ok) {
			// If unauthorized, we might return mock data for demonstration purposes 
			// in this dev phase, but officially we should return error.
			// Let's return error to follow "nothing that can break in production"
			return { 
				overview: null, 
				views: null, 
				error: 'Please log in to view analytics' 
			};
		}

		const overview = await overviewRes.json();
		const views = await viewsRes.json();

		return { overview, views, error: null };
	} catch (err) {
		return { 
			overview: null, 
			views: null, 
			error: 'Analytics service unavailable' 
		};
	}
};
