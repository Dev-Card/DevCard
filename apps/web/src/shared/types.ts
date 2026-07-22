// Types used by the public-facing web pages.
// Sourced from @devcard/shared — keep in sync.

export interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
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

export type AttendeeRole = 'PARTICIPANT' | 'ORGANIZER' | 'MENTOR';

export interface EventDetail {
  id: string;
  name: string;
  slug: string;
  location: string;
  description: string | null;
  organizerId: string;
  organizerUsername: string;
  organizerDisplayName: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  attendeesCount: number;
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
  role: AttendeeRole;
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
