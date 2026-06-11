// In the browser, the Vite dev proxy can forward /auth and /api to the backend,
// so we use relative URLs to avoid CORS. We fall back to VITE_API_URL if configured.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  onUnauthorized?: () => void;
};

export async function apiFetch<T>(
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

    // Unpack zod fieldErrors into a readable string
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
