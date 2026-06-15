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

export type CardVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export interface Card {
  id: string;
  title: string;
  description?: string | null;
  slug?: string;
  visibility?: CardVisibility;
  qrEnabled?: boolean;
  viewCount?: number;
  isDefault: boolean;
  links: PlatformLink[];
}

export interface CreateCardPayload {
  title: string;
  linkIds: string[];
  description?: string;
  visibility?: CardVisibility;
}

export interface UpdateCardPayload {
  title?: string;
  linkIds?: string[];
  description?: string;
  visibility?: CardVisibility;
  qrEnabled?: boolean;
}

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

export type FollowStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FollowResult {
  platform: string;
  targetUsername: string;
  status: FollowStatus;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CardView {
  id: string;
  cardId: string | null;
  ownerId: string;
  viewerId: string | null;
  viewerIp: string | null;
  viewerAgent: string | null;
  source: string;
  createdAt: Date | string;
}

export interface AnalyticsOverview {
  totalViews: number;
  uniqueViewers: number;
  totalFollows: number;
  viewsToday: number;
  recentViews: Array<CardView & {
    viewer?: {
      displayName: string;
      avatarUrl: string | null;
    } | null;
    card?: {
      title: string;
    } | null;
  }>;
}

export interface ConnectedPlatform {
  platform: string;
  connectedAt: Date | string;
  scopes: string;
}

export interface FollowLog {
  id: string;
  followerId: string;
  targetUsername: string;
  platform: string;
  status: string;
  layer: string;
  createdAt: Date | string;
}

export interface OAuthTokenInfo {
  platform: string;
  connected: boolean;
  scopes: string;
}
