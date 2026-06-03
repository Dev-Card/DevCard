import { API_BASE_URL } from '../config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  onUnauthorized?: () => void;
};

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token, onUnauthorized }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 || res.status === 403) {
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.message ?? `Request failed: ${res.status}`);
  }

  // Some endpoints may return empty responses
  const text = await res.text();
  if (!text) return (null as unknown) as T;
  return JSON.parse(text) as T;
}

export const get = <T>(path: string, token?: string | null) => apiRequest<T>(path, { method: 'GET', token });
export const post = <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: 'POST', body, token });
export const put = <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: 'PUT', body, token });
export const del = <T>(path: string, body?: unknown, token?: string | null) => apiRequest<T>(path, { method: 'DELETE', body, token });

export default { apiRequest, get, post, put, del };
