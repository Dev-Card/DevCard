// ── Centralized Mobile Type Definitions ───────────────────────────────────────
// Re-exports shared types and defines mobile-only types to eliminate duplicate
// interface declarations across screens (was duplicated in 4+ files).

export type {
  User,
  PlatformLink,
  Card,
  PublicProfile,
  PublicCard,
  FollowStatus,
  FollowResult,
  AuthResponse,
  CardView,
  AnalyticsOverview,
  ConnectedPlatform,
  FollowLog,
  OAuthTokenInfo,
  CreateLinkPayload,
  UpdateProfilePayload,
  CreateCardPayload,
  UpdateCardPayload,
  ReorderLinksPayload,
} from '@devcard/shared';

export type { PlatformDef, FollowStrategy } from '@devcard/shared';

// ── Mobile-only Types ─────────────────────────────────────────────────────────

export interface SavedContact {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  accentColor: string;
  bio: string | null;
  role: string | null;
  company: string | null;
  metAt: string | null;
  note: string | null;
  savedAt: string;
}

export interface EventSummary {
  id: string;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  startDate: string;
  endDate: string;
  attendeesCount: number;
}

export interface EventDetail extends EventSummary {
  organizerId: string;
  createdAt: string;
}

export interface EventAttendee {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string | null;
  members: TeamMember[];
}

export interface TeamMember {
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  teamRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export type FollowState = Record<string, 'idle' | 'loading' | 'success' | 'error'>;

export interface NfcPayload {
  type: 'URI';
  payload: string;
}
