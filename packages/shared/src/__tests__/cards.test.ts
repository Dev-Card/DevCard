import { describe, it, expect } from 'vitest';
import { validateCardPlatforms, diffCardPlatforms } from '../cards.js';

// ─── validateCardPlatforms ───

describe('validateCardPlatforms', () => {
  it('accepts a valid list of known platforms', () => {
    const result = validateCardPlatforms(['github', 'linkedin', 'twitter']);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts an empty array', () => {
    const result = validateCardPlatforms([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects unknown platform IDs', () => {
    const result = validateCardPlatforms(['github', 'myspace', 'xmpp']);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"myspace"'))).toBe(true);
    expect(result.errors.some((e) => e.includes('"xmpp"'))).toBe(true);
  });

  it('rejects duplicate platform IDs', () => {
    const result = validateCardPlatforms(['github', 'github', 'linkedin']);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate') && e.includes('"github"'))).toBe(true);
  });

  it('rejects lists exceeding 10 platforms', () => {
    const platforms = ['github', 'linkedin', 'twitter', 'gitlab', 'devfolio', 'npm', 'devto', 'hashnode', 'medium', 'leetcode', 'hackerrank'];
    expect(platforms.length).toBeGreaterThan(10);
    const result = validateCardPlatforms(platforms);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at most 10'))).toBe(true);
  });

  it('accepts exactly 10 platforms', () => {
    const platforms = ['github', 'linkedin', 'twitter', 'gitlab', 'devfolio', 'npm', 'devto', 'hashnode', 'medium', 'leetcode'];
    expect(platforms.length).toBe(10);
    const result = validateCardPlatforms(platforms);
    expect(result.valid).toBe(true);
  });

  it('accumulates multiple errors in a single pass', () => {
    const result = validateCardPlatforms(['github', 'github', 'unknown1', 'unknown2']);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3); // dup + 2 unknown
  });

  it('returns all platform IDs listed in PLATFORMS as valid', () => {
    const known = ['github', 'linkedin', 'twitter', 'gitlab', 'devfolio', 'npm'];
    const result = validateCardPlatforms(known);
    expect(result.valid).toBe(true);
  });
});

// ─── diffCardPlatforms ───

describe('diffCardPlatforms', () => {
  it('detects added platforms', () => {
    const result = diffCardPlatforms(['github'], ['github', 'linkedin']);
    expect(result.added).toEqual(['linkedin']);
    expect(result.removed).toEqual([]);
    expect(result.unchanged).toEqual(['github']);
  });

  it('detects removed platforms', () => {
    const result = diffCardPlatforms(['github', 'linkedin'], ['github']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(['linkedin']);
    expect(result.unchanged).toEqual(['github']);
  });

  it('detects unchanged platforms', () => {
    const result = diffCardPlatforms(['github', 'twitter'], ['github', 'twitter']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.unchanged).toContain('github');
    expect(result.unchanged).toContain('twitter');
  });

  it('handles both added and removed in the same diff', () => {
    const result = diffCardPlatforms(['github', 'twitter'], ['github', 'linkedin']);
    expect(result.added).toEqual(['linkedin']);
    expect(result.removed).toEqual(['twitter']);
    expect(result.unchanged).toEqual(['github']);
  });

  it('handles empty old card', () => {
    const result = diffCardPlatforms([], ['github', 'linkedin']);
    expect(result.added).toEqual(['github', 'linkedin']);
    expect(result.removed).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it('handles empty new card', () => {
    const result = diffCardPlatforms(['github', 'linkedin'], []);
    expect(result.added).toEqual([]);
    expect(result.removed).toContain('github');
    expect(result.removed).toContain('linkedin');
    expect(result.unchanged).toEqual([]);
  });

  it('handles both cards empty', () => {
    const result = diffCardPlatforms([], []);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it('is order-insensitive for membership checks', () => {
    const result = diffCardPlatforms(['linkedin', 'github'], ['github', 'linkedin']);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});
