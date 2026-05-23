import { describe, it, expect } from 'vitest';
import { isSupportedPlatform } from '../platforms';

// ─── isSupportedPlatform Tests ───

describe('isSupportedPlatform', () => {
  it('returns true for known platform: github', () => {
    expect(isSupportedPlatform('github')).toBe(true);
  });

  it('returns true for known platform: linkedin', () => {
    expect(isSupportedPlatform('linkedin')).toBe(true);
  });

  it('returns true for known platform: twitter', () => {
    expect(isSupportedPlatform('twitter')).toBe(true);
  });

  it('returns true for known platform: discord', () => {
    expect(isSupportedPlatform('discord')).toBe(true);
  });

  it('returns true for known platform: email', () => {
    expect(isSupportedPlatform('email')).toBe(true);
  });

  it('returns false for unknown platform id', () => {
    expect(isSupportedPlatform('unknown-platform')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSupportedPlatform('')).toBe(false);
  });

  it('returns false for near-miss platform names', () => {
    expect(isSupportedPlatform('Github')).toBe(false);
    expect(isSupportedPlatform('GITHUB')).toBe(false);
    expect(isSupportedPlatform('git hub')).toBe(false);
  });

  it('returns a boolean value (not truthy/falsy)', () => {
    expect(typeof isSupportedPlatform('github')).toBe('boolean');
    expect(typeof isSupportedPlatform('nope')).toBe('boolean');
  });
});
