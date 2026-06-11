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

export interface AuthResponse {
  token: string;
  user: User;
}
