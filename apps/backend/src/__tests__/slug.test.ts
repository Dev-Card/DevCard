import { describe, it, expect, vi } from 'vitest';

import { createSlug, generateUniqueSlug } from '../utils/slug';

describe('createSlug', () => {
  it('lowercases and trims input', () => {
    expect(createSlug('  Hello World  ')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(createSlug('My Team Name')).toBe('my-team-name');
  });

  it('strips non-alphanumeric characters', () => {
    expect(createSlug('DevCard @Core!')).toBe('devcard-core');
  });

  it('collapses multiple hyphens', () => {
    expect(createSlug('a--b---c')).toBe('a-b-c');
  });

  it('removes leading and trailing hyphens', () => {
    expect(createSlug('--team--')).toBe('team');
  });
});

describe('generateUniqueSlug', () => {
  it('returns base slug when it is available', async () => {
    const slugExists = vi.fn().mockResolvedValue(false);
    const result = await generateUniqueSlug('My Team', slugExists);
    expect(result).toBe('my-team');
    expect(slugExists).toHaveBeenCalledOnce();
  });

  it('returns sequential numeric suffix when base slug is taken', async () => {
    const slugExists = vi.fn()
      .mockResolvedValueOnce(true)  // my-team taken
      .mockResolvedValueOnce(false); // my-team-1 free
    const result = await generateUniqueSlug('My Team', slugExists);
    expect(result).toBe('my-team-1');
  });

  it('increments suffix deterministically until a free slot is found', async () => {
    const slugExists = vi.fn()
      .mockResolvedValueOnce(true)  // my-team
      .mockResolvedValueOnce(true)  // my-team-1
      .mockResolvedValueOnce(true)  // my-team-2
      .mockResolvedValueOnce(false); // my-team-3 free
    const result = await generateUniqueSlug('My Team', slugExists);
    expect(result).toBe('my-team-3');
  });

  it('throws when all 10 suffix candidates are taken', async () => {
    const slugExists = vi.fn().mockResolvedValue(true);
    await expect(generateUniqueSlug('My Team', slugExists)).rejects.toThrow(
      'Unable to generate unique slug',
    );
    expect(slugExists).toHaveBeenCalledTimes(11); // base + 10 suffixes
  });

  it('produces consistent slugs across concurrent calls for different inputs', async () => {
    const takenSlugs = new Set<string>();
    const slugExists = vi.fn(async (slug: string) => takenSlugs.has(slug));

    const [a, b] = await Promise.all([
      generateUniqueSlug('Alpha Team', slugExists),
      generateUniqueSlug('Beta Team', slugExists),
    ]);

    expect(a).toBe('alpha-team');
    expect(b).toBe('beta-team');
    expect(a).not.toBe(b);
  });
});
