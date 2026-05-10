import { PLATFORMS } from './platforms.js';

// ─── Types ───

export type CardValidationResult = {
  valid: boolean;
  errors: string[];
};

export type CardDiffResult = {
  added: string[];
  removed: string[];
  unchanged: string[];
};

// ─── Constants ───

const MAX_PLATFORMS_PER_CARD = 10;

// ─── Validation ───

/**
 * Validate the list of platform IDs on a card.
 *
 * Rules:
 * - All IDs must exist in PLATFORMS
 * - No duplicates
 * - At most MAX_PLATFORMS_PER_CARD entries
 */
export function validateCardPlatforms(platforms: string[]): CardValidationResult {
  const errors: string[] = [];

  if (platforms.length > MAX_PLATFORMS_PER_CARD) {
    errors.push(`A card can have at most ${MAX_PLATFORMS_PER_CARD} platforms (got ${platforms.length}).`);
  }

  const seen = new Set<string>();
  for (const id of platforms) {
    if (!PLATFORMS[id]) {
      errors.push(`Unknown platform: "${id}".`);
    }
    if (seen.has(id)) {
      errors.push(`Duplicate platform: "${id}".`);
    }
    seen.add(id);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Diffing ───

/**
 * Compute the diff between two sets of platform IDs.
 *
 * Returns which IDs were added, removed, or unchanged going from
 * oldCard → newCard. Order is not considered — only membership.
 */
export function diffCardPlatforms(oldCard: string[], newCard: string[]): CardDiffResult {
  const oldSet = new Set(oldCard);
  const newSet = new Set(newCard);

  const added = newCard.filter((id) => !oldSet.has(id));
  const removed = oldCard.filter((id) => !newSet.has(id));
  const unchanged = oldCard.filter((id) => newSet.has(id));

  return { added, removed, unchanged };
}
