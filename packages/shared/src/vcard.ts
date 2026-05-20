import type { PlatformLink } from './types';
import { getProfileUrl } from './platforms';

export interface VCardInput {
  displayName: string;
  username: string;
  bio?: string | null;
  pronouns?: string | null;
  role?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  links?: PlatformLink[];
  devcardUrl?: string;
  email?: string | null;
  phone?: string | null;
}

/**
 * Escapes characters for vCard compatibility per RFC 2426 specs.
 * Backslashes, semicolons, commas, and newlines must be escaped.
 */
function escapeValue(val: string | null | undefined): string {
  if (!val) return '';
  return val
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates a valid type-safe vCard (.vcf) string from DevCard profile data.
 * Adheres to standard vCard 3.0 specification.
 */
export function generateVCard(profile: VCardInput): string {
  const displayName = (profile.displayName || profile.username || 'Developer').trim();
  
  // Parse first and last name for structured N field
  const nameParts = displayName.split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() || '' : '';
  const firstName = nameParts.join(' ');

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeValue(lastName)};${escapeValue(firstName)};;;`,
    `FN:${escapeValue(displayName)}`,
  ];

  if (profile.company) {
    lines.push(`ORG:${escapeValue(profile.company)}`);
  }

  if (profile.role) {
    lines.push(`TITLE:${escapeValue(profile.role)}`);
  }

  // Determine public email and phone number
  let email = profile.email || '';
  let phone = profile.phone || '';

  if (profile.links) {
    for (const link of profile.links) {
      if (link.platform === 'email') {
        email = link.username || email;
      } else if (link.platform === 'phone' || link.platform === 'tel') {
        phone = link.username || phone;
      } else if (link.url) {
        if (link.url.startsWith('mailto:')) {
          email = link.url.substring(7) || email;
        } else if (link.url.startsWith('tel:')) {
          phone = link.url.substring(4) || phone;
        }
      }
    }
  }

  if (email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(email)}`);
  }

  if (phone) {
    lines.push(`TEL;TYPE=CELL:${escapeValue(phone)}`);
  }

  // Construct NOTE/bio/pronouns/role details
  const noteParts: string[] = [];
  if (profile.bio) {
    noteParts.push(profile.bio);
  }
  if (profile.pronouns) {
    noteParts.push(`Pronouns: ${profile.pronouns}`);
  }
  if (profile.role || profile.company) {
    const roleStr = [profile.role, profile.company].filter(Boolean).join(' @ ');
    noteParts.push(`Role: ${roleStr}`);
  }

  if (noteParts.length > 0) {
    lines.push(`NOTE:${escapeValue(noteParts.join('\n'))}`);
  }

  // Include dynamic profile picture loading
  if (profile.avatarUrl) {
    lines.push(`PHOTO;VALUE=URI:${escapeValue(profile.avatarUrl)}`);
  }

  // Support social URLs
  const socialUrls: { label: string; url: string }[] = [];
  if (profile.devcardUrl) {
    socialUrls.push({ label: 'DevCard', url: profile.devcardUrl });
  } else {
    socialUrls.push({ label: 'DevCard', url: `https://devcard.dev/u/${profile.username}` });
  }

  if (profile.links) {
    for (const link of profile.links) {
      // Avoid duplicate listing for email link as URL if it's already an email field
      if (link.platform === 'email') continue;

      const url = link.url || getProfileUrl(link.platform, link.username);
      if (url) {
        const label = link.platform.charAt(0).toUpperCase() + link.platform.slice(1);
        socialUrls.push({ label, url });
      }
    }
  }

  socialUrls.forEach(social => {
    lines.push(`URL;type=${escapeValue(social.label)}:${escapeValue(social.url)}`);
  });

  lines.push('END:VCARD');

  // Must end each line with CRLF (\r\n) per RFC standard
  return lines.join('\r\n');
}
