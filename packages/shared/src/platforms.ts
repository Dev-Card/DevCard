export type FollowStrategy = 'api' | 'webview' | 'link' | 'copy';

export interface PlatformDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  urlPattern: string;
  deepLinkPattern: string | null;
  webViewUrlPattern: string | null;
  followStrategy: FollowStrategy;
  oauthScopes: string[];
  usernamePlaceholder: string;
  usesFullUrl: boolean;
  validationRegex?: RegExp;
}

export const PLATFORMS: Record<string, PlatformDef> = {
  github: {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    color: '#181717',
    urlPattern: 'https://github.com/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'api',
    oauthScopes: ['user:follow', 'read:user'],
    usernamePlaceholder: 'e.g. octocat',
    usesFullUrl: false,
    validationRegex: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    urlPattern: 'https://www.linkedin.com/in/{username}',
    deepLinkPattern: 'linkedin://profile?id={username}',
    webViewUrlPattern: 'https://www.linkedin.com/in/{username}',
    followStrategy: 'webview',
    oauthScopes: ['r_liteprofile'],
    usernamePlaceholder: 'e.g. johndoe',
    usesFullUrl: false,
    validationRegex: /^[a-zA-Z0-9-]{3,100}$/,
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    icon: 'twitter',
    color: '#000000',
    urlPattern: 'https://x.com/{username}',
    deepLinkPattern: 'twitter://user?screen_name={username}',
    webViewUrlPattern: 'https://x.com/{username}',
    followStrategy: 'webview',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. elonmusk',
    usesFullUrl: false,
    validationRegex: /^[A-Za-z0-9_]{1,15}$/,
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    icon: 'gitlab',
    color: '#FC6D26',
    urlPattern: 'https://gitlab.com/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. gitlab-user',
    usesFullUrl: false,
  },
  devfolio: {
    id: 'devfolio',
    name: 'Devfolio',
    icon: 'devfolio',
    color: '#3770FF',
    urlPattern: 'https://devfolio.co/@{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. hacker123',
    usesFullUrl: false,
  },
  npm: {
    id: 'npm',
    name: 'npm',
    icon: 'npm',
    color: '#CB3837',
    urlPattern: 'https://www.npmjs.com/~{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. sindresorhus',
    usesFullUrl: false,
  },
  devto: {
    id: 'devto',
    name: 'Dev.to',
    icon: 'devto',
    color: '#0A0A0A',
    urlPattern: 'https://dev.to/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. ben',
    usesFullUrl: false,
  },
  hashnode: {
    id: 'hashnode',
    name: 'Hashnode',
    icon: 'hashnode',
    color: '#2962FF',
    urlPattern: 'https://hashnode.com/@{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. writer',
    usesFullUrl: false,
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    icon: 'medium',
    color: '#000000',
    urlPattern: 'https://medium.com/@{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. writer',
    usesFullUrl: false,
  },
  leetcode: {
    id: 'leetcode',
    name: 'LeetCode',
    icon: 'leetcode',
    color: '#FFA116',
    urlPattern: 'https://leetcode.com/u/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. coder',
    usesFullUrl: false,
  },
  hackerrank: {
    id: 'hackerrank',
    name: 'HackerRank',
    icon: 'hackerrank',
    color: '#00EA64',
    urlPattern: 'https://www.hackerrank.com/profile/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. hacker',
    usesFullUrl: false,
  },
  stackoverflow: {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    icon: 'stackoverflow',
    color: '#F58025',
    urlPattern: 'https://stackoverflow.com/users/{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. 1234/username',
    usesFullUrl: false,
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    urlPattern: '',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'copy',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. user#1234',
    usesFullUrl: false,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: 'telegram',
    color: '#26A5E4',
    urlPattern: 'https://t.me/{username}',
    deepLinkPattern: 'tg://resolve?domain={username}',
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. durov',
    usesFullUrl: false,
  },
  email: {
    id: 'email',
    name: 'Email',
    icon: 'email',
    color: '#EA4335',
    urlPattern: 'mailto:{username}',
    deepLinkPattern: 'mailto:{username}',
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. hello@example.com',
    usesFullUrl: true,
  },
  portfolio: {
    id: 'portfolio',
    name: 'Portfolio',
    icon: 'globe',
    color: '#6366F1',
    urlPattern: '{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. https://mysite.dev',
    usesFullUrl: true,
  },
  custom: {
    id: 'custom',
    name: 'Custom Link',
    icon: 'link',
    color: '#8B5CF6',
    urlPattern: '{username}',
    deepLinkPattern: null,
    webViewUrlPattern: null,
    followStrategy: 'link',
    oauthScopes: [],
    usernamePlaceholder: 'e.g. https://example.com/profile',
    usesFullUrl: true,
  },
};

export function getAllPlatforms(): PlatformDef[] {
  return Object.values(PLATFORMS);
}

export function getPlatform(id: string): PlatformDef | undefined {
  return PLATFORMS[id];
}

export function getProfileUrl(platformId: string, username: string): string {
  const platform = PLATFORMS[platformId];
  if (!platform) return '';
  return platform.urlPattern.replace(/{username}/g, username);
}

export function getWebViewUrl(platformId: string, username: string): string | null {
  const platform = PLATFORMS[platformId];
  if (!platform?.webViewUrlPattern) return null;
  return platform.webViewUrlPattern.replace(/{username}/g, username);
}

export function getDeepLinkUrl(platformId: string, username: string): string | null {
  const platform = PLATFORMS[platformId];
  if (!platform?.deepLinkPattern) return null;
  return platform.deepLinkPattern.replace(/{username}/g, username);
}
