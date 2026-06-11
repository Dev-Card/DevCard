// In the browser the Vite dev proxy forwards /auth and /api to the backend,
// so we use relative URLs (no CORS). On the server (SSR load functions) we
// need the full URL because there is no proxy there.
const API_BASE_URL =
  typeof window !== 'undefined'
    ? ''                                                          // browser → proxy
    : (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000'); // SSR → direct

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  onUnauthorized?: () => void;
};

export async function apiRequest<T>(
  endpoint: string,
  { method = 'GET', body, token, onUnauthorized }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401 || response.status === 403) {
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as any;

    // Unpack zod fieldErrors into a readable string, e.g.:
    //   "password: Password must be at least 8 characters · username: Invalid format"
    const fieldErrors = errorBody?.details?.fieldErrors as Record<string, string[]> | undefined;
    if (fieldErrors) {
      const parts = Object.entries(fieldErrors)
        .flatMap(([field, msgs]) => msgs.map((m: string) => `${field}: ${m}`));
      if (parts.length) throw new Error(parts.join(' · '));
    }

    throw new Error(errorBody?.error ?? errorBody?.message ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
