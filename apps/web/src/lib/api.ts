export async function apiFetch(path: string, options: RequestInit = {}) {
  // Route all browser fetches through the SvelteKit /api/ proxy gateway
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const url = `/api/${cleanPath}`;

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
