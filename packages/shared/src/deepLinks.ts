import { getPlatform } from './platforms';

export type LinkStrategy = 'native-deeplink' | 'universal-link' | 'web-url' | 'webview';

export type ResolvedLink = {
  strategy: LinkStrategy;
  url: string;
  fallback?: ResolvedLink;
};

export function resolveDeepLink(
  platformId: string,
  username: string,
  context: { hasApp?: boolean; isMobile?: boolean } = {}
): ResolvedLink {
  const platform = getPlatform(platformId);
  if (!platform) {
    throw new Error(`Unknown platform: ${platformId}`);
  }

  const { isMobile = false, hasApp } = context;

  // Helper to replace {username} in patterns
  const buildUrl = (pattern: string | null): string => {
    if (!pattern) return '';
    if (!pattern.includes('{username}')) {
      return pattern === '{username}' ? username : pattern;
    }
    return pattern.replace(/{username}/g, username);
  };

  const chain: ResolvedLink[] = [];

  if (isMobile) {
    // 1. Native Deep Link
    if (platform.nativeScheme && platform.deepLinkPattern) {
      const nativeUrl = buildUrl(platform.deepLinkPattern);
      if (hasApp === true || hasApp === undefined) {
        chain.push({
          strategy: 'native-deeplink',
          url: nativeUrl,
        });
      }
    }

    // 2. Universal Link
    if (platform.universalLink) {
      chain.push({
        strategy: 'universal-link',
        url: buildUrl(platform.universalLink),
      });
    }

    // 3. WebView Fallback
    if (platform.webViewFallback && platform.webViewUrlPattern) {
      chain.push({
        strategy: 'webview',
        url: buildUrl(platform.webViewUrlPattern),
      });
    }

    // 4. Web URL Fallback
    if (platform.urlPattern) {
      chain.push({
        strategy: 'web-url',
        url: buildUrl(platform.urlPattern),
      });
    }
  } else {
    // Desktop context
    // 1. WebView
    if (platform.webViewFallback && platform.webViewUrlPattern) {
      chain.push({
        strategy: 'webview',
        url: buildUrl(platform.webViewUrlPattern),
      });
    }

    // 2. Web URL
    if (platform.urlPattern) {
      chain.push({
        strategy: 'web-url',
        url: buildUrl(platform.urlPattern),
      });
    }
  }

  if (chain.length === 0) {
    // Fallback just in case
    return {
      strategy: 'web-url',
      url: username,
    };
  }

  // Link the chain together
  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].fallback = chain[i + 1];
  }

  return chain[0];
}
