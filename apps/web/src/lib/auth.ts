import type { AuthResponse } from '@devcard/shared';
import { apiRequest } from './apiClient';

const TOKEN_KEY = 'devcard_token';

export function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function signup(payload: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  const response = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: payload,
  });
  storeToken(response.token);
  return response;
}

export async function login(payload: { email: string; password: string }) {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
  storeToken(response.token);
  return response;
}
