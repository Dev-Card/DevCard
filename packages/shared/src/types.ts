// ─── User Types ───

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  createdAt: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  username?: string;
  bio?: string | null;
  pronouns?: string | null;
  role?: string | null;
  company?: string | null;
  accentColor?: string;
}

// ─── Platform Link Types ───

export interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
}

export interface CreateLinkPayload {
  platform: string;
  username: string;
  url?: string;
}

export interface ReorderLinksPayload {
  links: Array<{ id: string; displayOrder: number }>;
}

// ─── Card Types ───

export interface Card {
  id: string;
  title: string;
  isDefault: boolean;
  links: PlatformLink[];
}

export interface CreateCardPayload {
  title: string;
  linkIds: string[];
}

export interface UpdateCardPayload {
  title?: string;
  linkIds?: string[];
}

// ─── Public Profile Types ───

export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  links: PlatformLink[];
}

export interface PublicCard {
  title: string;
  owner: {
    username: string;
    displayName: string;
    bio: string | null;
    pronouns: string | null;
    role: string | null;
    company: string | null;
    avatarUrl: string | null;
    accentColor: string;
  };
  links: PlatformLink[];
}

// ─── Follow Engine Types ───

export type FollowStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FollowResult {
  platform: string;
  targetUsername: string;
  status: FollowStatus;
  message?: string;
}

// ─── Auth Types ───

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OAuthTokenInfo {
  platform: string;
  connected: boolean;
  scopes: string;
}
