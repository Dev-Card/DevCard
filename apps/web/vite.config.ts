import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Proxy all /auth and /api requests to the backend dev server.
      // This runs only in `vite dev` — no CORS headers needed at all.
      '/auth': { target: BACKEND, changeOrigin: true },
      '/api':  { target: BACKEND, changeOrigin: true },
    },
  },
})
