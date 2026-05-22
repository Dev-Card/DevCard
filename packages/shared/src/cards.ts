export type CardValidationResult = {
  valid: boolean;
  errors: string[];
};

const PLATFORMS = [
  'github',
  'linkedin',
  'twitter',
  'instagram',
  'youtube',
  'twitch',
  'discord',
  'devto',
  'hashnode',
  'medium',
  'dribbble',
  'behance',
  'figma',
  'stackoverflow',
  'leetcode',
  'codepen',
  'replit',
  'npm',
  'producthunt',
  'website',
] as const;

export type Platform = typeof PLATFORMS[number];

const PLATFORM_SET = new Set<string>(PLATFORMS);

export function validateCardPlatforms(
  platforms: string[]
): CardValidationResult {
  const errors: string[] = [];

  if (platforms.length === 0) {
    errors.push('At least one platform is required.');
  }

  if (platforms.length > 10) {
    errors.push(`Maximum 10 platforms allowed, got ${platforms.length}.`);
  }

  const seen = new Set<string>();

  for (const raw of platforms) {
    const p = raw.trim().toLowerCase();

    if (!PLATFORM_SET.has(p)) {
      errors.push(`Unknown platform: "${raw}".`);
      continue;
    }

    if (seen.has(p)) {
      errors.push(`Duplicate platform: "${raw}".`);
      continue;
    }

    seen.add(p);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
