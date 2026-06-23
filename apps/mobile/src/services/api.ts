import { API_BASE_URL } from '../config';

const DEMO_TOKEN = 'devcard-demo-token';

type DemoLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
};

type DemoCard = {
  id: string;
  title: string;
  profileId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  cardLinks: Array<{
    id: string;
    cardId: string;
    linkId: string;
    displayOrder: number;
    link: DemoLink;
  }>;
};

const nowIso = () => new Date().toISOString();

const demoState: {
  profile: any;
  links: DemoLink[];
  cards: DemoCard[];
} = {
  profile: {
    id: 'demo-user-1',
    email: 'demo@devcard.app',
    username: 'demo_dev',
    displayName: 'Demo Developer',
    bio: 'Building and testing DevCard in demo mode.',
    pronouns: 'she/her',
    role: 'Full Stack Engineer',
    company: 'DevCard Labs',
    avatarUrl: null,
    accentColor: '#6366F1',
    defaultCardId: 'card-1',
  },
  links: [
    { id: 'link-1', platform: 'github', username: 'demo-dev', url: 'https://github.com/demo-dev', displayOrder: 0 },
    { id: 'link-2', platform: 'linkedin', username: 'demo-dev', url: 'https://linkedin.com/in/demo-dev', displayOrder: 1 },
    { id: 'link-3', platform: 'x', username: 'demo_dev', url: 'https://x.com/demo_dev', displayOrder: 2 },
  ],
  cards: [
    {
      id: 'card-1',
      title: 'Main Card',
      profileId: 'demo-user-1',
      isDefault: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      cardLinks: [],
    },
  ],
};

const hydrateCards = () => {
  demoState.cards = demoState.cards.map(card => ({
    ...card,
    cardLinks: demoState.links.map((link, index) => ({
      id: `${card.id}-${link.id}`,
      cardId: card.id,
      linkId: link.id,
      displayOrder: index,
      link,
    })),
  }));
};

hydrateCards();

function handleDemoRequest<T>(path: string, method: RequestOptions['method'], body?: any): T {
  if (path === '/api/profiles/me' && method === 'GET') {
    return { ...demoState.profile, platformLinks: demoState.links } as T;
  }

  if (path === '/api/analytics/overview' && method === 'GET') {
    return { views: 128, scans: 41, clicks: 79, thisWeek: 24 } as T;
  }

  if (path === '/api/analytics/views' && method === 'GET') {
    return {
      total: 128,
      weekly: [12, 18, 22, 15, 28, 17, 16],
      sources: [{ source: 'qr', count: 51 }, { source: 'profile', count: 77 }],
    } as T;
  }

  if (path === '/api/cards' && method === 'GET') return demoState.cards as T;
  if (path === '/api/cards' && method === 'POST') {
    const id = `card-${Date.now()}`;
    const card = {
      id,
      title: body?.title || 'New Card',
      profileId: demoState.profile.id,
      isDefault: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      cardLinks: demoState.links.map((link: DemoLink, index: number) => ({
        id: `${id}-${link.id}`,
        cardId: id,
        linkId: link.id,
        displayOrder: index,
        link,
      })),
    };
    demoState.cards.unshift(card);
    return card as T;
  }

  if (path.startsWith('/api/cards/') && path.endsWith('/default') && method === 'PUT') {
    const id = path.split('/')[3];
    demoState.cards = demoState.cards.map(card => ({ ...card, isDefault: card.id === id }));
    demoState.profile.defaultCardId = id;
    return { ok: true } as T;
  }

  if (path.startsWith('/api/cards/') && method === 'DELETE') {
    const id = path.split('/')[3];
    demoState.cards = demoState.cards.filter(card => card.id !== id);
    if (!demoState.cards.some(card => card.id === demoState.profile.defaultCardId)) {
      demoState.profile.defaultCardId = demoState.cards[0]?.id ?? null;
      demoState.cards = demoState.cards.map((card, index) => ({ ...card, isDefault: index === 0 }));
    }
    return { ok: true } as T;
  }

  if (path === '/api/profiles/me/links' && method === 'POST') {
    const id = `link-${Date.now()}`;
    const username = body?.username || 'demo-user';
    const platform = body?.platform || 'github';
    const link: DemoLink = {
      id,
      platform,
      username,
      url: `https://${platform}.com/${username}`,
      displayOrder: demoState.links.length,
    };
    demoState.links.push(link);
    hydrateCards();
    return link as T;
  }

  if (path.startsWith('/api/profiles/me/links/') && method === 'DELETE') {
    const id = path.split('/')[5];
    demoState.links = demoState.links.filter(link => link.id !== id).map((link, index) => ({ ...link, displayOrder: index }));
    hydrateCards();
    return { ok: true } as T;
  }

  if (path === '/api/profiles/me/links/reorder' && method === 'PUT') {
    const orderMap = new Map<string, number>((body?.links || []).map((item: any) => [item.id, Number(item.displayOrder)]));
    demoState.links = demoState.links
      .map(link => ({ ...link, displayOrder: orderMap.get(link.id) ?? link.displayOrder }))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((link, index) => ({ ...link, displayOrder: index }));
    hydrateCards();
    return { ok: true } as T;
  }

  if (path === '/api/profiles/me' && method === 'PUT') {
    demoState.profile = { ...demoState.profile, ...(body || {}) };
    return demoState.profile as T;
  }

  if (path === '/api/connect/status' && method === 'GET') {
    return { github: true, linkedin: true, x: false, discord: false } as T;
  }

  if (path.startsWith('/api/connect/') && method === 'DELETE') {
    return { ok: true } as T;
  }

  if (path === '/api/nfc/payload' && method === 'GET') {
    return { url: `https://devcard.app/u/${demoState.profile.username}`, username: demoState.profile.username } as T;
  }

  if (path.startsWith('/api/u/') && method === 'GET') {
    const username = path.split('/')[3];
    return {
      profile: { ...demoState.profile, username },
      links: demoState.links,
      cards: demoState.cards,
    } as T;
  }

  if (path.startsWith('/api/events/') && method === 'GET') {
    if (path.endsWith('/attendees')) {
      return [{ id: 'demo-user-1', username: 'demo_dev', displayName: 'Demo Developer' }] as T;
    }
    const slug = path.split('/')[3];
    return {
      id: slug,
      slug,
      title: 'Demo Builders Meetup',
      description: 'Local event for testing flow and UX.',
      location: 'Remote',
      attendeeCount: 23,
      isAttending: true,
    } as T;
  }

  if (path.startsWith('/api/events/') && (method === 'POST' || method === 'DELETE')) return { ok: true } as T;
  if (path.startsWith('/api/teams/') && method === 'GET') {
    const slug = path.split('/')[3];
    return {
      id: slug,
      slug,
      name: 'Demo Team',
      description: 'Demo collaboration team',
      members: [{ id: 'demo-user-1', username: 'demo_dev', displayName: 'Demo Developer' }],
    } as T;
  }

  if (path.startsWith('/api/follow/') && (method === 'POST' || method === 'DELETE')) {
    return { ok: true, redirectUrl: null } as T;
  }

  return (null as unknown) as T;
}

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
  if (token === DEMO_TOKEN) {
    return handleDemoRequest<T>(path, method, body);
  }

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

export { DEMO_TOKEN };
export default { apiRequest, get, post, put, del };
