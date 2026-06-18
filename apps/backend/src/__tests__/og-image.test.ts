import { describe, expect, it } from 'vitest';

import { isSafeAvatarUrl } from '../utils/og-image.js';

describe('isSafeAvatarUrl', () => {
  it.each([
    'http://avatars.githubusercontent.com/u/1',
    'https://localhost/avatar.png',
    'https://127.0.0.1/avatar.png',
    'https://10.0.0.4/avatar.png',
    'https://172.16.0.4/avatar.png',
    'https://192.168.1.4/avatar.png',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/avatar.png',
    'https://[fe80::1]/avatar.png',
    'https://[fd00::1]/avatar.png',
  ])('rejects unsafe avatar URL %s', (url) => {
    expect(isSafeAvatarUrl(url)).toBe(false);
  });

  it.each([
    'https://avatars.githubusercontent.com/u/1',
    'https://cdn.example.com/avatar.png',
  ])('allows public HTTPS avatar URL %s', (url) => {
    expect(isSafeAvatarUrl(url)).toBe(true);
  });
});
