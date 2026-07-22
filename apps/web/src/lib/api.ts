const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** localStorage key holding the user's JWT. Set it manually for now — the web
 *  app has no login flow yet, so authenticated actions (e.g. marking event
 *  attendance) read the token from here when present. */
export const AUTH_TOKEN_KEY = 'devcard-token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the stored JWT as a Bearer token. Defaults to true for
   *  non-GET requests, false for GET (public endpoints). */
  auth?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const useAuth = options.auth ?? method !== 'GET';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useAuth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      (error as Record<string, string>)?.error ??
        (error as Record<string, string>)?.message ??
        `Request failed: ${response.status}`,
      response.status
    );
  }

  // 204 No Content (e.g. leaving an event) has no JSON body.
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
