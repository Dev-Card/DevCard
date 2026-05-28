const API_BASE_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000';

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
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any)?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}