import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('token');

	if (token) {
    try {
      // Call backend to verify token and get user info
      const res = await event.fetch('http://localhost:3000/api/profiles/me');
      
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
	return response;
};
