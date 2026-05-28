import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export interface AnalyticsOverview {
	totalViews: number;
	viewsToday: number;
	uniqueViewers: number;
	totalFollows: number;
	recentViews: Array<{
		createdAt: string;
		source: string;
		viewer?: {
			avatarUrl?: string;
			displayName?: string;
		};
	}>;
}

export interface AnalyticsViews {
	meta: {
		total: number;
	};
	data: Array<{
		createdAt: string;
		source: string;
		viewerIp?: string;
		viewer?: {
			displayName?: string;
			username?: string;
		};
		card?: {
			title?: string;
		};
	}>;
}

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = cookies.get('token');

	if (!token) {
		if (!dev) {
			throw redirect(302, '/');
		}
		return {
			overview: null,
			views: null,
			error: 'Please log in to view analytics'
		};
	}

	try {
		const headers = { Authorization: `Bearer ${token}` };
		const [overviewRes, viewsRes] = await Promise.all([
			fetch(`${API_BASE}/api/analytics/overview`, { headers }),
			fetch(`${API_BASE}/api/analytics/views`, { headers })
		]);

		if (!overviewRes.ok || !viewsRes.ok) {
			if (overviewRes.status === 401 || viewsRes.status === 401) {
				if (!dev) {
					throw redirect(302, '/');
				}
			}
			return {
				overview: null,
				views: null,
				error: 'Please log in to view analytics'
			};
		}

		const overview = (await overviewRes.json()) as AnalyticsOverview;
		const views = (await viewsRes.json()) as AnalyticsViews;

		return { overview, views, error: null };
	} catch (err) {
		// If it's a redirect thrown by SvelteKit, let it bubble up
		if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
			throw err;
		}
		return {
			overview: null,
			views: null,
			error: 'Analytics service unavailable'
		};
	}
};
