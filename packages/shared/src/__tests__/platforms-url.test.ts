import { describe, it, expect } from 'vitest';
import { getProfileUrl, getWebViewUrl, getDeepLinkUrl } from '../platforms';

// ─── getProfileUrl Tests ───

describe('getProfileUrl', () => {
  it('should return the correct GitHub profile URL', () => {
    expect(getProfileUrl('github', 'octocat')).toBe('https://github.com/octocat');
  });

  it('should return the correct LinkedIn profile URL', () => {
    expect(getProfileUrl('linkedin', 'john')).toBe('https://www.linkedin.com/in/john');
  });

  it('should return the correct Twitter profile URL', () => {
    expect(getProfileUrl('twitter', 'john')).toBe('https://x.com/john');
  });

  it('should return empty string for an unknown platform', () => {
    expect(getProfileUrl('nonexistent', 'user')).toBe('');
  });
});

// ─── getWebViewUrl Tests ───

describe('getWebViewUrl', () => {
  it('should return the correct LinkedIn webview URL', () => {
    expect(getWebViewUrl('linkedin', 'john')).toBe('https://www.linkedin.com/in/john');
  });

  it('should return the correct Twitter webview URL', () => {
    expect(getWebViewUrl('twitter', 'john')).toBe('https://x.com/john');
  });

  it('should return null for platforms without a webview URL (github)', () => {
    expect(getWebViewUrl('github', 'octocat')).toBeNull();
  });

  it('should return null for an unknown platform', () => {
    expect(getWebViewUrl('nonexistent', 'user')).toBeNull();
  });
});

// ─── getDeepLinkUrl Tests ───

describe('getDeepLinkUrl', () => {
  it('should return the correct Twitter deep link URL', () => {
    expect(getDeepLinkUrl('twitter', 'john')).toBe('twitter://user?screen_name=john');
  });

  it('should return the correct LinkedIn deep link URL', () => {
    expect(getDeepLinkUrl('linkedin', 'john')).toBe('linkedin://profile?id=john');
  });

  it('should return null for platforms without a deep link (github)', () => {
    expect(getDeepLinkUrl('github', 'octocat')).toBeNull();
  });

  it('should return null for an unknown platform', () => {
    expect(getDeepLinkUrl('nonexistent', 'user')).toBeNull();
  });
});
