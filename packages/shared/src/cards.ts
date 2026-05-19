export type CardValidationResult = {
  valid: boolean;
  errors: string[];
};

const PLATFORMS = new Set([
  'github', 'linkedin', 'twitter', 'instagram', 'youtube',
  'twitch', 'discord', 'devto', 'hashnode', 'medium',
  'dribbble', 'behance', 'figma', 'stackoverflow', 'leetcode',
  'codepen', 'replit', 'npm', 'producthunt', 'website',
]);

export function validateCardPlatforms(platforms: string[]): CardValidationResult {
  const errors: string[] = [];

  if (platforms.length === 0) {
    errors.push('At least one platform is required.');
  }

  if (platforms.length > 10) {
    errors.push(`Maximum 10 platforms allowed, got ${platforms.length}.`);
  }

  const seen = new Set<string>();
  for (const p of platforms) {
    if (!PLATFORMS.has(p)) {
      errors.push(`Unknown platform: "${p}".`);
    }
    if (seen.has(p)) {
      errors.push(`Duplicate platform: "${p}".`);
    }
    seen.add(p);
  }

  return { valid: errors.length === 0, errors };
}

export function diffCardPlatforms(
  oldCard: string[],
  newCard: string[]
): { added: string[]; removed: string[]; unchanged: string[] } {
  const oldSet = new Set(oldCard);
  const newSet = new Set(newCard);

  return {
    added: newCard.filter(p => !oldSet.has(p)),
    removed: oldCard.filter(p => !newSet.has(p)),
    unchanged: oldCard.filter(p => newSet.has(p)),
  };
}