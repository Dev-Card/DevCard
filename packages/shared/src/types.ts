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

/**
 * Shared TypeScript types used across the DevCard monorepo.
 *
 * ADDED for issue: "web + backend: add public shareable profile URL with Open Graph meta tags"
 *
 * These types define the shape of the public (unauthenticated) card API
 * response used by both the backend route and the SvelteKit web page.
 */

// ─── Public profile types ─────────────────────────────────────────────────────

/**
 * A single platform link returned by the public card API.
 */
export interface PublicCardLink {
  /** Platform identifier (e.g. "github", "linkedin", "twitter") */
  platform: string;
  /** The full URL to the user's profile on this platform */
  url: string;
  /** Optional custom display label (falls back to platform name if null) */
  label: string | null;
}

/**
 * Response shape for GET /public/cards/:username
 *
 * Only contains fields that are safe to expose publicly.
 * No email, no analytics, no internal IDs.
 */
export interface PublicCardResponse {
  /** The user's unique username (used in the /u/:username URL) */
  username: string;
  /** The user's display name (may differ from username) */
  displayName: string | null;
  /** Short bio shown on the public profile */
  bio: string | null;
  /** URL to the user's avatar image */
  avatarUrl: string | null;
  /** All platform links on the user's default card */
  links: PublicCardLink[];
}
