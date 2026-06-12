import { describe, it, expect } from 'vitest';
import { isSupportedPlatform, PLATFORMS } from '../platforms';

// ─── isSupportedPlatform Tests ───

describe('isSupportedPlatform', () => {
  it('should return true for every registered platform', () => {
    for (const id of Object.keys(PLATFORMS)) {
      expect(isSupportedPlatform(id)).toBe(true);
    }
  });

  it('should return true for "github"', () => {
    expect(isSupportedPlatform('github')).toBe(true);
  });

  it('should return true for "linkedin"', () => {
    expect(isSupportedPlatform('linkedin')).toBe(true);
  });

  it('should return true for "twitter"', () => {
    expect(isSupportedPlatform('twitter')).toBe(true);
  });

  it('should return true for "stackoverflow"', () => {
    expect(isSupportedPlatform('stackoverflow')).toBe(true);
  });

  it('should return false for an unknown platform ID', () => {
    expect(isSupportedPlatform('nonexistent')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isSupportedPlatform('')).toBe(false);
  });

  it('should return false for a misspelled platform ID', () => {
    expect(isSupportedPlatform('Github')).toBe(false);
  });
});
