import adapterVercel from '@sveltejs/adapter-vercel';
import adapterNode from '@sveltejs/adapter-node';

const isCI = process.env.CI === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: isCI ? adapterNode() : adapterVercel(),
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
        'img-src': ['self', 'data:', 'https:'],
        'connect-src': ['self', 'http://localhost:3000'],
        'font-src': ['self', 'data:', 'https:', 'https://fonts.gstatic.com'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'frame-ancestors': ['none']
      }
    }
  },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) => ({ runes: !filename.includes('node_modules') })
  }
};

export default config;