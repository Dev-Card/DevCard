import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('token');

	if (token) {
		try {
			// Call backend to verify token and get user info
			const apiUrl = import.meta.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:3000';
			const res = await event.fetch(`${apiUrl}/api/profiles/me`);
			
			if (res.ok) {
				event.locals.user = await res.json();
			} else {
				event.cookies.delete('token', { path: '/' });
				event.locals.user = undefined;
			}
		} catch (err) {
			console.error('Auth verification failed:', err);
			// Optional: fallback to mock for UI development if backend is not running
			// event.locals.user = { id: 'mock-id', username: 'dev-user' };
		}
	}

	const response = await resolve(event);

	// Security Headers (Note: CSP is handled in svelte.config.js)
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
