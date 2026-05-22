import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000';

export const fallback: RequestHandler = async ({ params, request, cookies, url }) => {
  const path = params.path;
  const token = cookies.get('token');

  // Build headers
  const headers = new Headers(request.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Suppress headers that could conflict during local proxying
  headers.delete('host');
  headers.delete('connection');

  // Fastify route resolution: strip any duplicate leading api/ prefixes
  let cleanPath = path;
  if (cleanPath.startsWith('api/')) {
    cleanPath = cleanPath.substring(4);
  }
  const targetPath = cleanPath.startsWith('auth/') ? cleanPath : `api/${cleanPath}`;
  const targetUrl = new URL(`${API_BASE}/${targetPath}${url.search}`);

  try {
    let requestBody: any = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const blob = await request.blob();
      if (blob.size > 0) {
        requestBody = blob;
      } else {
        headers.delete('content-type');
      }
    }

    const res = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: requestBody,
    });

    const responseHeaders = new Headers();
    const contentType = res.headers.get('Content-Type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    // Forward cookies set by the backend (like token set on login)
    const setCookie = res.headers.get('Set-Cookie');
    if (setCookie) {
      responseHeaders.set('Set-Cookie', setCookie);
    }

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('DevCard Proxy Error:', err);
    return new Response(JSON.stringify({ error: 'Backend API is currently offline.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
