import { describe, it, expect } from 'vitest';
import { getProfileUrl, getWebViewUrl, getDeepLinkUrl } from '../platforms';

describe('getProfileUrl', () => {
  it('returns the correct GitHub profile URL', () => {
    expect(getProfileUrl('github', 'octocat')).toBe('https://github.com/octocat');
  });

  it('returns the correct LinkedIn profile URL', () => {
    expect(getProfileUrl('linkedin', 'johndoe')).toBe('https://www.linkedin.com/in/johndoe');
  });

  it('returns empty string for an unknown platform', () => {
    expect(getProfileUrl('unknown', 'x')).toBe('');
  });
});

describe('getWebViewUrl', () => {
  it('returns the LinkedIn webview URL', () => {
    expect(getWebViewUrl('linkedin', 'johndoe')).toBe('https://www.linkedin.com/in/johndoe');
  });

  it('returns null for github (no webview URL)', () => {
    expect(getWebViewUrl('github', 'octocat')).toBeNull();
  });
});

describe('getDeepLinkUrl', () => {
  it('returns the Twitter deep link URL', () => {
    expect(getDeepLinkUrl('twitter', 'elonmusk')).toBe('twitter://user?screen_name=elonmusk');
  });

  it('returns null for github (no deep link)', () => {
    expect(getDeepLinkUrl('github', 'octocat')).toBeNull();
  });
});
