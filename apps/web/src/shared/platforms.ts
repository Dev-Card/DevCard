// Platform definitions used by the public-facing web pages.
// Sourced from @devcard/shared — keep in sync.

export interface PlatformDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  urlPattern: string;
}

export const PLATFORMS: Record<string, PlatformDef> = {
  github:       { id: 'github',       name: 'GitHub',        icon: 'github',      color: '#181717',  urlPattern: 'https://github.com/{username}' },
  linkedin:     { id: 'linkedin',     name: 'LinkedIn',      icon: 'linkedin',    color: '#0A66C2',  urlPattern: 'https://www.linkedin.com/in/{username}' },
  twitter:      { id: 'twitter',      name: 'Twitter / X',   icon: 'twitter',     color: '#000000',  urlPattern: 'https://x.com/{username}' },
  gitlab:       { id: 'gitlab',       name: 'GitLab',        icon: 'gitlab',      color: '#FC6D26',  urlPattern: 'https://gitlab.com/{username}' },
  devfolio:     { id: 'devfolio',     name: 'Devfolio',      icon: 'devfolio',    color: '#3770FF',  urlPattern: 'https://devfolio.co/@{username}' },
  npm:          { id: 'npm',          name: 'npm',           icon: 'npm',         color: '#CB3837',  urlPattern: 'https://www.npmjs.com/~{username}' },
  devto:        { id: 'devto',        name: 'Dev.to',        icon: 'devto',       color: '#0A0A0A',  urlPattern: 'https://dev.to/{username}' },
  hashnode:     { id: 'hashnode',     name: 'Hashnode',      icon: 'hashnode',    color: '#2962FF',  urlPattern: 'https://hashnode.com/@{username}' },
  medium:       { id: 'medium',       name: 'Medium',        icon: 'medium',      color: '#000000',  urlPattern: 'https://medium.com/@{username}' },
  leetcode:     { id: 'leetcode',     name: 'LeetCode',      icon: 'leetcode',    color: '#FFA116',  urlPattern: 'https://leetcode.com/u/{username}' },
  hackerrank:   { id: 'hackerrank',   name: 'HackerRank',    icon: 'hackerrank',  color: '#00EA64',  urlPattern: 'https://www.hackerrank.com/profile/{username}' },
  stackoverflow:{ id: 'stackoverflow',name: 'Stack Overflow', icon: 'stackoverflow', color: '#F58025', urlPattern: 'https://stackoverflow.com/users/{username}' },
  discord:      { id: 'discord',      name: 'Discord',       icon: 'discord',     color: '#5865F2',  urlPattern: '' },
  telegram:     { id: 'telegram',     name: 'Telegram',      icon: 'telegram',    color: '#26A5E4',  urlPattern: 'https://t.me/{username}' },
  email:        { id: 'email',        name: 'Email',         icon: 'email',       color: '#EA4335',  urlPattern: 'mailto:{username}' },
  portfolio:    { id: 'portfolio',    name: 'Portfolio',      icon: 'globe',       color: '#6366F1',  urlPattern: '{username}' },
  custom:       { id: 'custom',       name: 'Custom Link',   icon: 'link',        color: '#8B5CF6',  urlPattern: '{username}' },
};

export function getProfileUrl(platformId: string, username: string): string {
  const platform = PLATFORMS[platformId];
  if (!platform) return '';
  return platform.urlPattern.replace(/{username}/g, username);
}
