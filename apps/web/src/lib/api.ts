const BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';


export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  // In SvelteKit, we should handle cookies properly
  // For client-side calls, the browser sends the cookie automatically
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  getMe: () => fetchWithAuth('/api/profiles/me'),
  getCards: () => fetchWithAuth('/api/cards'),
  getProfiles: (username: string) => fetchWithAuth(`/api/u/${username}`),
};
