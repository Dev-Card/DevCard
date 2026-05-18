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

// ─── GitHub Insights Types ───

export interface GitHubRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  isForked: boolean;
  updatedAt: string;
}

export interface GitHubLanguageStat {
  language: string;
  /** Percentage of total bytes across all repos (0–100) */
  percentage: number;
  /** Raw byte count */
  bytes: number;
}

export interface GitHubInsights {
  /** GitHub username */
  username: string;
  /** Total public repositories */
  totalRepos: number;
  /** Total stars received across all repos */
  totalStars: number;
  /** Total forks received across all repos */
  totalForks: number;
  /** Total followers */
  followers: number;
  /** Total following */
  following: number;
  /** Top 5 repos by star count */
  topRepos: GitHubRepo[];
  /** Language breakdown sorted by usage */
  languageStats: GitHubLanguageStat[];
  /** Primary (most-used) language */
  primaryLanguage: string | null;
  /** Account creation date */
  accountCreatedAt: string;
  /** ISO timestamp of when this data was fetched/cached */
  fetchedAt: string;
  /** AI-generated developer summary (null if AI key not configured) */
  aiSummary: string | null;
}
