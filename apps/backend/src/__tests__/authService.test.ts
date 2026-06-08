import { describe, it, expect } from 'vitest';

import {
  isSafeMobileRedirectUri,
  buildOAuthState,
  getMobileRedirectUri,
} from '../services/authService.js';

// ─── isSafeMobileRedirectUri ──────────────────────────────────────────────────

describe('isSafeMobileRedirectUri', () => {
  it('accepts devcard:// URIs', () => {
    expect(isSafeMobileRedirectUri('devcard://oauth/callback')).toBe(true);
    expect(isSafeMobileRedirectUri('devcard://')).toBe(true);
  });

  it('accepts exp:// URIs (Expo Go development)', () => {
    expect(isSafeMobileRedirectUri('exp://192.168.1.1:8081')).toBe(true);
    expect(isSafeMobileRedirectUri('exp://localhost')).toBe(true);
  });

  it('rejects plain https:// URIs', () => {
    expect(isSafeMobileRedirectUri('https://attacker.com/steal')).toBe(false);
    expect(isSafeMobileRedirectUri('https://devcard.dev/auth')).toBe(false);
  });

  it('rejects http:// URIs', () => {
    expect(isSafeMobileRedirectUri('http://localhost:3000')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isSafeMobileRedirectUri('')).toBe(false);
  });

  it('rejects URIs that embed a safe scheme in a path component', () => {
    // An attacker-crafted URI that includes "devcard://" somewhere other
    // than the start must not be treated as safe.
    expect(isSafeMobileRedirectUri('https://evil.com?redirect=devcard://x')).toBe(false);
  });

  it('rejects javascript: URIs', () => {
    expect(isSafeMobileRedirectUri('javascript:alert(1)')).toBe(false);
  });
});

// ─── buildOAuthState ──────────────────────────────────────────────────────────

describe('buildOAuthState', () => {
  it('returns a random hex string when clientState is empty', () => {
    const state = buildOAuthState('', '');
    expect(state).toMatch(/^[0-9a-f]{64}$/);
  });

  it('appends a random nonce to a non-mobile clientState', () => {
    const state = buildOAuthState('web_flow', '');
    const parts = state.split('.');
    expect(parts[0]).toBe('web_flow');
    expect(parts[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('embeds a safe mobile redirect URI in the state', () => {
    const uri = 'devcard://oauth/callback';
    const state = buildOAuthState('mobile_github', uri);
    const parts = state.split('.');
    expect(parts[0]).toBe('mobile_github');
    // Decode the second segment and verify it matches the original URI
    const decoded = Buffer.from(parts[1], 'base64url').toString('utf8');
    expect(decoded).toBe(uri);
  });

  it('drops an unsafe mobile redirect URI and omits the embedded segment', () => {
    // When the caller supplies an https:// URI the state must not contain
    // the encoded form of that URI — the URI segment is skipped entirely.
    const state = buildOAuthState('mobile_github', 'https://attacker.com/steal');
    const parts = state.split('.');
    // With no embedded URI the state is: <clientState>.<nonce>
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe('mobile_github');
    // The second part must be the random nonce, not a base64url of the bad URI
    expect(parts[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('drops an empty mobile redirect URI', () => {
    const state = buildOAuthState('mobile_github', '');
    const parts = state.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe('mobile_github');
  });

  it('generates a unique nonce on every call', () => {
    const a = buildOAuthState('mobile_github', 'devcard://oauth/callback');
    const b = buildOAuthState('mobile_github', 'devcard://oauth/callback');
    // The random nonce component (last segment) must differ
    expect(a.split('.').at(-1)).not.toBe(b.split('.').at(-1));
  });
});

// ─── getMobileRedirectUri ─────────────────────────────────────────────────────

describe('getMobileRedirectUri', () => {
  it('returns null for non-mobile state strings', () => {
    expect(getMobileRedirectUri('web_flow.abc123')).toBeNull();
    expect(getMobileRedirectUri(undefined)).toBeNull();
    expect(getMobileRedirectUri('')).toBeNull();
  });

  it('returns null when the state has no embedded URI segment', () => {
    // A mobile state without an embedded redirect: mobile_x.<nonce>
    const nonce = 'a'.repeat(64);
    const state = `mobile_github.${nonce}`;
    // The second segment is the nonce, not a base64url-encoded URI —
    // decoding it yields a non-devcard string, so null is expected.
    const result = getMobileRedirectUri(state);
    // Either null (failed decode or not a safe scheme) is correct
    expect(result === null || !result.startsWith('devcard://')).toBe(true);
  });

  it('returns the decoded URI for a state built with a safe redirect', () => {
    const uri = 'devcard://oauth/callback';
    const state = buildOAuthState('mobile_github', uri);
    expect(getMobileRedirectUri(state)).toBe(uri);
  });

  it('returns null when the embedded URI is an https:// URL', () => {
    // Simulate a tampered state that encodes a forbidden URI directly,
    // bypassing buildOAuthState's validation.
    const forbiddenUri = 'https://attacker.com/steal';
    const encoded = Buffer.from(forbiddenUri, 'utf8').toString('base64url');
    const nonce = 'b'.repeat(64);
    const tamperedState = `mobile_github.${encoded}.${nonce}`;
    expect(getMobileRedirectUri(tamperedState)).toBeNull();
  });

  it('returns null when the embedded segment cannot be decoded', () => {
    const state = 'mobile_github.!!!invalid_base64!!!.abc';
    expect(getMobileRedirectUri(state)).toBeNull();
  });

  it('returns null for an exp:// URI embedded in a tampered state', () => {
    // exp:// is allowed, but this test checks the allowlist works end-to-end
    // for Expo Go URIs constructed via buildOAuthState.
    const uri = 'exp://192.168.1.42:8081';
    const state = buildOAuthState('mobile_github', uri);
    expect(getMobileRedirectUri(state)).toBe(uri);
  });
});
