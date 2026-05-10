import { describe, it, expect } from 'vitest';
import { isSupportedPlatform } from '../platforms';

describe('isSupportedPlatform', () => {
  it('returns true for github', () => {
    expect(isSupportedPlatform('github')).toBe(true);
  });

  it('returns true for linkedin', () => {
    expect(isSupportedPlatform('linkedin')).toBe(true);
  });

  it('returns false for myspace (unknown platform)', () => {
    expect(isSupportedPlatform('myspace')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSupportedPlatform('')).toBe(false);
  });

  it('returns false for GITHUB (case-sensitive check)', () => {
    expect(isSupportedPlatform('GITHUB')).toBe(false);
  });

  it('returns false for inherited Object prototype keys like toString', () => {
    expect(isSupportedPlatform('toString')).toBe(false);
    expect(isSupportedPlatform('constructor')).toBe(false);
    expect(isSupportedPlatform('__proto__')).toBe(false);
  });
});
