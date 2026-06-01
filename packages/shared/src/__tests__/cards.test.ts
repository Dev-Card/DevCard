import { describe, it, expect } from 'vitest';
import { validateCardPlatforms, diffCardPlatforms } from '../cards';

describe('validateCardPlatforms', () => {
  it('passes with valid platforms', () => {
    const result = validateCardPlatforms(['github', 'linkedin']);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails with empty array', () => {
    const result = validateCardPlatforms([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one platform is required.');
  });

  it('fails with unknown platform', () => {
    const result = validateCardPlatforms(['github', 'myspace']);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('myspace'))).toBe(true);
  });

  it('fails with duplicate platforms', () => {
    const result = validateCardPlatforms(['github', 'github']);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('passes with exactly 10 platforms', () => {
    const platforms = ['github','linkedin','twitter','youtube','twitch',
                       'discord','devto','medium','dribbble','leetcode'];
    const result = validateCardPlatforms(platforms);
    expect(result.valid).toBe(true);
  });

  it('fails with more than 10 platforms', () => {
    const platforms = ['github','linkedin','twitter','youtube','twitch',
                       'discord','devto','medium','dribbble','leetcode','npm'];
    const result = validateCardPlatforms(platforms);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Maximum 10'))).toBe(true);
  });

  it('fails with all invalid platforms', () => {
    const result = validateCardPlatforms(['myspace', 'bebo']);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('diffCardPlatforms', () => {
  it('correctly identifies added, removed, unchanged', () => {
    const diff = diffCardPlatforms(['github', 'linkedin'], ['github', 'twitter']);
    expect(diff.added).toEqual(['twitter']);
    expect(diff.removed).toEqual(['linkedin']);
    expect(diff.unchanged).toEqual(['github']);
  });

  it('handles empty old card', () => {
    const diff = diffCardPlatforms([], ['github']);
    expect(diff.added).toEqual(['github']);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual([]);
  });

  it('handles identical cards', () => {
    const diff = diffCardPlatforms(['github'], ['github']);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toEqual(['github']);
  });
});