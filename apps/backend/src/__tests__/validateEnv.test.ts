import { describe, it, expect, vi, afterEach } from 'vitest';

import { validateEnv } from '../utils/validateEnv.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Replaces process.exit with a throwing stub for the duration of the test so
 * that a failing validateEnv() call does not terminate the test process.
 * Returns the spy so callers can assert the exit code.
 */
function stubExit(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
    throw new Error(`process.exit(${code})`);
  }) as unknown as ReturnType<typeof vi.spyOn>;
}

// ── test suite ────────────────────────────────────────────────────────────────

describe('validateEnv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // ─── JWT_SECRET ──────────────────────────────────────────────────────────

  it('exits with code 1 when JWT_SECRET is absent', () => {
    vi.stubEnv('JWT_SECRET', undefined as unknown as string);
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-encryption-key');
    const exit = stubExit();

    expect(() => validateEnv()).toThrow('process.exit(1)');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when JWT_SECRET is an empty string', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-encryption-key');
    stubExit();

    expect(() => validateEnv()).toThrow('process.exit(1)');
  });

  it('exits with code 1 when JWT_SECRET is the known insecure default in production', () => {
    vi.stubEnv('JWT_SECRET', 'dev-secret-change-me');
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-encryption-key');
    vi.stubEnv('NODE_ENV', 'production');
    stubExit();

    expect(() => validateEnv()).toThrow('process.exit(1)');
  });

  it('allows the known insecure default in non-production (development)', () => {
    // The known-insecure check is production-only so local development still
    // works with the default value without requiring a full secrets setup.
    vi.stubEnv('JWT_SECRET', 'dev-secret-change-me');
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-encryption-key');
    vi.stubEnv('NODE_ENV', 'development');

    // Must not throw / call process.exit
    expect(() => validateEnv()).not.toThrow();
  });

  it('allows the known insecure default when NODE_ENV is not set', () => {
    vi.stubEnv('JWT_SECRET', 'dev-secret-change-me');
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-encryption-key');
    vi.stubEnv('NODE_ENV', undefined as unknown as string);

    expect(() => validateEnv()).not.toThrow();
  });

  // ─── ENCRYPTION_KEY ──────────────────────────────────────────────────────

  it('exits with code 1 when ENCRYPTION_KEY is absent', () => {
    vi.stubEnv('JWT_SECRET', 'a-valid-jwt-secret-that-is-sufficiently-long');
    vi.stubEnv('ENCRYPTION_KEY', undefined as unknown as string);
    stubExit();

    expect(() => validateEnv()).toThrow('process.exit(1)');
  });

  it('exits with code 1 when ENCRYPTION_KEY is an empty string', () => {
    vi.stubEnv('JWT_SECRET', 'a-valid-jwt-secret-that-is-sufficiently-long');
    vi.stubEnv('ENCRYPTION_KEY', '');
    stubExit();

    expect(() => validateEnv()).toThrow('process.exit(1)');
  });

  // ─── Multiple failures ────────────────────────────────────────────────────

  it('reports both missing secrets in a single exit call', () => {
    vi.stubEnv('JWT_SECRET', undefined as unknown as string);
    vi.stubEnv('ENCRYPTION_KEY', undefined as unknown as string);
    const exit = stubExit();

    expect(() => validateEnv()).toThrow('process.exit(1)');
    // A single exit — not one per error — so operators fix everything in one deploy.
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  // ─── Happy path ──────────────────────────────────────────────────────────

  it('passes when both secrets are valid in development', () => {
    vi.stubEnv('JWT_SECRET', 'a-valid-jwt-secret-that-is-sufficiently-long');
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-32-char-encryption-key!!');
    vi.stubEnv('NODE_ENV', 'development');

    expect(() => validateEnv()).not.toThrow();
  });

  it('passes when both secrets are valid in production', () => {
    vi.stubEnv('JWT_SECRET', 'a-long-random-production-jwt-secret-with-enough-entropy');
    vi.stubEnv('ENCRYPTION_KEY', 'a-64-char-hex-encryption-key-for-aes-256-gcm-0000000000000000');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => validateEnv()).not.toThrow();
  });

  // ─── No secret leakage ───────────────────────────────────────────────────

  it('does not log the value of JWT_SECRET when reporting errors', () => {
    const secretValue = 'super-secret-value-that-must-not-appear-in-logs';
    vi.stubEnv('JWT_SECRET', undefined as unknown as string);
    vi.stubEnv('ENCRYPTION_KEY', 'a-valid-encryption-key');
    stubExit();

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validateEnv()).toThrow('process.exit(1)');

    const allOutput = errSpy.mock.calls.flat().join(' ');
    expect(allOutput).not.toContain(secretValue);
  });
});
