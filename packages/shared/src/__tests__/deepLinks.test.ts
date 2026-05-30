import { describe, it, expect } from 'vitest';
import { resolveDeepLink } from '../deepLinks';

describe('Deep Link Resolver', () => {
  describe('LinkedIn resolution (supports all strategies)', () => {
    it('returns native deep link as first strategy when on mobile and hasApp is true', () => {
      const link = resolveDeepLink('linkedin', 'john-doe', { isMobile: true, hasApp: true });
      expect(link.strategy).toBe('native-deeplink');
      expect(link.url).toBe('linkedin://profile?id=john-doe');
      
      // Fallback chain verification
      expect(link.fallback).toBeDefined();
      expect(link.fallback!.strategy).toBe('universal-link');
      expect(link.fallback!.url).toBe('https://www.linkedin.com/in/john-doe');

      expect(link.fallback!.fallback).toBeDefined();
      expect(link.fallback!.fallback!.strategy).toBe('webview');
      expect(link.fallback!.fallback!.url).toBe('https://www.linkedin.com/in/john-doe');

      expect(link.fallback!.fallback!.fallback).toBeDefined();
      expect(link.fallback!.fallback!.fallback!.strategy).toBe('web-url');
      expect(link.fallback!.fallback!.fallback!.url).toBe('https://www.linkedin.com/in/john-doe');
    });

    it('omits native deep link when hasApp is false', () => {
      const link = resolveDeepLink('linkedin', 'john-doe', { isMobile: true, hasApp: false });
      expect(link.strategy).toBe('universal-link');
      expect(link.url).toBe('https://www.linkedin.com/in/john-doe');
      
      expect(link.fallback).toBeDefined();
      expect(link.fallback!.strategy).toBe('webview');
    });

    it('includes native deep link as first strategy when hasApp is undefined (default guess)', () => {
      const link = resolveDeepLink('linkedin', 'john-doe', { isMobile: true });
      expect(link.strategy).toBe('native-deeplink');
    });

    it('resolves desktop context with webview as first choice', () => {
      const link = resolveDeepLink('linkedin', 'john-doe', { isMobile: false });
      expect(link.strategy).toBe('webview');
      expect(link.url).toBe('https://www.linkedin.com/in/john-doe');

      expect(link.fallback).toBeDefined();
      expect(link.fallback!.strategy).toBe('web-url');
      expect(link.fallback!.url).toBe('https://www.linkedin.com/in/john-doe');
    });
  });

  describe('Twitter / X resolution', () => {
    it('returns native deep link and replaces username in pattern', () => {
      const link = resolveDeepLink('twitter', 'elonmusk', { isMobile: true, hasApp: true });
      expect(link.strategy).toBe('native-deeplink');
      expect(link.url).toBe('twitter://user?screen_name=elonmusk');
      
      expect(link.fallback!.strategy).toBe('universal-link');
      expect(link.fallback!.url).toBe('https://x.com/elonmusk');
    });
  });

  describe('Telegram resolution (custom native protocols)', () => {
    it('resolves tg:// scheme correctly', () => {
      const link = resolveDeepLink('telegram', 'durov', { isMobile: true });
      expect(link.strategy).toBe('native-deeplink');
      expect(link.url).toBe('tg://resolve?domain=durov');
      
      expect(link.fallback!.strategy).toBe('universal-link');
      expect(link.fallback!.url).toBe('https://t.me/durov');
    });
  });

  describe('GitHub resolution (standard web profile, no deep link/webview)', () => {
    it('resolves directly to web-url fallback', () => {
      const link = resolveDeepLink('github', 'octocat', { isMobile: true });
      expect(link.strategy).toBe('web-url');
      expect(link.url).toBe('https://github.com/octocat');
      expect(link.fallback).toBeUndefined();
    });

    it('resolves directly to web-url on desktop', () => {
      const link = resolveDeepLink('github', 'octocat', { isMobile: false });
      expect(link.strategy).toBe('web-url');
      expect(link.url).toBe('https://github.com/octocat');
      expect(link.fallback).toBeUndefined();
    });
  });

  describe('Full URL platforms (portfolio / custom)', () => {
    it('uses the username string directly as the URL without pattern formatting', () => {
      const link = resolveDeepLink('portfolio', 'https://john.dev', { isMobile: true });
      expect(link.strategy).toBe('web-url');
      expect(link.url).toBe('https://john.dev');
    });
  });

  describe('Unknown platforms', () => {
    it('throws error for unregistered platform ID', () => {
      expect(() => resolveDeepLink('myspace', 'user')).toThrowError('Unknown platform');
    });
  });
});
