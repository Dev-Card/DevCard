/**
 * Startup environment validation.
 *
 * Validates all required secrets before the application registers any plugins.
 * Missing or insecure values cause an immediate, deterministic process exit so
 * the server never reaches a partially-initialised auth state.
 *
 * Call this at the very top of buildApp(), before any Fastify plugin registration.
 */

/**
 * Secrets that are committed to the public repository and must not be used in
 * production. Any match triggers an immediate startup failure.
 */
const KNOWN_INSECURE_DEFAULTS: ReadonlySet<string> = new Set([
  'dev-secret-change-me',
]);

/**
 * Validates that all required secrets are present and safe.
 * Exits the process with code 1 on any violation, logging all failures at once
 * so operators can fix everything in a single deploy cycle.
 *
 * Secrets are never logged — only their presence and safety are reported.
 */
export function validateEnv(): void {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // ── JWT_SECRET ──────────────────────────────────────────────────────────────
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    errors.push(
      'JWT_SECRET is not set. Generate a secure value with:\n' +
      '    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    );
  } else if (isProduction && KNOWN_INSECURE_DEFAULTS.has(jwtSecret)) {
    errors.push(
      'JWT_SECRET is set to a known insecure default and cannot be used in production.\n' +
      '    Generate a secure value with:\n' +
      '    node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
    );
  }

  // ── ENCRYPTION_KEY ──────────────────────────────────────────────────────────
  // getEncryptionKey() in utils/encryption.ts already throws at call-time when
  // this is missing, but catching it at startup is safer — the error surfaces
  // before any request is served rather than mid-flight on the first encrypt/
  // decrypt call.
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    errors.push(
      'ENCRYPTION_KEY is not set. Generate a secure value with:\n' +
      '    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  // ── Fail fast ───────────────────────────────────────────────────────────────
  if (errors.length === 0) {
    return;
  }

  console.error('');
  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║  STARTUP FAILED — missing or insecure required secrets   ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error('');
  for (const msg of errors) {
    console.error(`  ✖  ${msg}`);
    console.error('');
  }

  process.exit(1);
}
