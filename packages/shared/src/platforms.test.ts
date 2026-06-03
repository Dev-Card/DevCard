import { describe, it, expect } from 'vitest';
import {
  PLATFORMS,
  getAllPlatforms,
  getPlatform,
  getProfileUrl,
  getWebViewUrl,
  getDeepLinkUrl,
} from './platforms';

// ─── StackOverflow Platform Tests ───

describe('stackoverflow platform', () => {
  it('should exist in PLATFORMS registry', () => {
    expect(PLATFORMS.stackoverflow).toBeDefined();
  });

  it('should have correct platform definition', () => {
    const so = PLATFORMS.stackoverflow;
    expect(so.id).toBe('stackoverflow');
    expect(so.name).toBe('Stack Overflow');
    expect(so.icon).toBe('stackoverflow');
    expect(so.color).toBe('#F58025');
    expect(so.urlPattern).toBe('https://stackoverflow.com/users/{username}');
    expect(so.followStrategy).toBe('link');
    expect(so.deepLinkPattern).toBeNull();
    expect(so.webViewUrlPattern).toBeNull();
    expect(so.oauthScopes).toEqual([]);
    expect(so.usesFullUrl).toBe(false);
    expect(so.usernamePlaceholder).toBeTruthy();
  });

  it('should be included in getAllPlatforms()', () => {
    const all = getAllPlatforms();
    const so = all.find((p) => p.id === 'stackoverflow');
    expect(so).toBeDefined();
    expect(so!.name).toBe('Stack Overflow');
  });

  it('should be retrievable via getPlatform()', () => {
    const so = getPlatform('stackoverflow');
    expect(so).toBeDefined();
    expect(so!.id).toBe('stackoverflow');
  });
});

// ─── getProfileUrl Tests for StackOverflow ───

describe('getProfileUrl – stackoverflow', () => {
  it('should generate correct URL with user ID and display name', () => {
    const url = getProfileUrl('stackoverflow', '1234/user');
    expect(url).toBe('https://stackoverflow.com/users/1234/user');
  });

  it('should generate correct URL with numeric ID only', () => {
    const url = getProfileUrl('stackoverflow', '56789');
    expect(url).toBe('https://stackoverflow.com/users/56789');
  });

  it('should return empty string for unknown platform', () => {
    const url = getProfileUrl('nonexistent', '1234');
    expect(url).toBe('');
  });
});

// ─── getWebViewUrl / getDeepLinkUrl for StackOverflow ───

describe('getWebViewUrl / getDeepLinkUrl – stackoverflow', () => {
  it('should return null for webViewUrl (not supported)', () => {
    expect(getWebViewUrl('stackoverflow', '1234/user')).toBeNull();
  });

  it('should return null for deepLinkUrl (not supported)', () => {
    expect(getDeepLinkUrl('stackoverflow', '1234/user')).toBeNull();
  });
});
