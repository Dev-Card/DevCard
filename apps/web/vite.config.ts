import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			// Proxy all /auth and /api requests to the backend dev server.
			// This runs only in `vite dev` — no CORS headers needed at all.
			'/auth': { target: BACKEND, changeOrigin: true },
			'/api':  { target: BACKEND, changeOrigin: true },
		},
	},
});
