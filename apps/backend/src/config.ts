/**
 * @file config.ts
 * @description Validated environment configuration module for the DevCard backend.
 *
 * ALL backend code must import configuration values from this module.
 * Direct reads of `process.env` anywhere else in `apps/backend` are forbidden.
 *
 * At module load time (i.e. server startup) every required variable is checked.
 * If any variable is missing, empty, or fails a security constraint the process
 * exits immediately with a descriptive error so the misconfiguration is caught
 * before the server begins accepting requests.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** All configuration values available to the backend. Fully typed — no `string | undefined`. */
export interface AppConfig {
  // Database
  database: {
    url: string;
  };

  // Redis
  redis: {
    url: string;
  };

  // JWT
  jwt: {
    secret: string;
  };

  // Encryption
  encryption: {
    key: string;
  };

  // GitHub OAuth
  github: {
    clientId: string;
    clientSecret: string;
  };

  // Google OAuth
  google: {
    clientId: string;
    clientSecret: string;
  };

  // App URLs
  app: {
    publicUrl: string;
    backendUrl: string;
    mobileRedirectUri: string;
  };

  // Server
  server: {
    port: number;
    nodeEnv: "development" | "production" | "test";
  };
}

// ─── Validation helpers ───────────────────────────────────────────────────────

interface ValidationError {
  variable: string;
  reason: string;
}

function getString(
  errors: ValidationError[],
  key: string,
  options: { minLength?: number } = {}
): string {
  const value = process.env[key];

  if (value === undefined || value.trim() === "") {
    errors.push({ variable: key, reason: "is required but was not set" });
    return ""; // placeholder; process will exit before this is used
  }

  const trimmed = value.trim();

  // Reject placeholder values left over from .env.example
  const placeholderPatterns = [
    /^your-/i,
    /^change-in-production$/i,
    /^your_/i,
    /-here$/i,
    /^<.+>$/,
  ];
  if (placeholderPatterns.some((re) => re.test(trimmed))) {
    errors.push({
      variable: key,
      reason: `looks like an unfilled placeholder ("${trimmed}"). Replace it with a real value.`,
    });
    return "";
  }

  if (options.minLength !== undefined && trimmed.length < options.minLength) {
    errors.push({
      variable: key,
      reason: `must be at least ${options.minLength} characters long (got ${trimmed.length})`,
    });
    return "";
  }

  return trimmed;
}

function getPort(errors: ValidationError[], key: string): number {
  const raw = process.env[key];

  if (raw === undefined || raw.trim() === "") {
    errors.push({ variable: key, reason: "is required but was not set" });
    return 0;
  }

  const port = Number(raw.trim());
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push({
      variable: key,
      reason: `must be a valid port number between 1 and 65535 (got "${raw}")`,
    });
    return 0;
  }

  return port;
}

function getNodeEnv(
  errors: ValidationError[],
  key: string
): AppConfig["server"]["nodeEnv"] {
  const allowed = ["development", "production", "test"] as const;
  const value = process.env[key];

  if (!value || value.trim() === "") {
    // Default gracefully to development
    return "development";
  }

  const trimmed = value.trim() as AppConfig["server"]["nodeEnv"];
  if (!allowed.includes(trimmed)) {
    errors.push({
      variable: key,
      reason: `must be one of: ${allowed.join(", ")} (got "${trimmed}")`,
    });
    return "development";
  }

  return trimmed;
}

// ─── Config factory (exported for testing) ───────────────────────────────────

/**
 * Parses and validates all environment variables.
 * Returns a fully-typed config object on success.
 * Calls `onError` (default: process.exit) with a formatted message on failure.
 *
 * @param env      - The environment object to read from (defaults to `process.env`)
 * @param onError  - Called with a human-readable error string when validation fails
 */
export function buildConfig(
  env: NodeJS.ProcessEnv = process.env,
  onError: (message: string) => never = (msg) => {
    console.error(msg);
    process.exit(1);
  }
): AppConfig {
  // Temporarily swap process.env so helper functions can read from `env`
  const original = process.env;
  // @ts-expect-error — deliberate override for testability
  process.env = env;

  const errors: ValidationError[] = [];

  const config: AppConfig = {
    database: {
      url: getString(errors, "DATABASE_URL"),
    },
    redis: {
      url: getString(errors, "REDIS_URL"),
    },
    jwt: {
      // JWT secrets should be at least 32 characters to provide adequate entropy
      secret: getString(errors, "JWT_SECRET", { minLength: 32 }),
    },
    encryption: {
      // 32-byte hex key = 64 hex chars
      key: getString(errors, "ENCRYPTION_KEY", { minLength: 32 }),
    },
    github: {
      clientId: getString(errors, "GITHUB_CLIENT_ID"),
      clientSecret: getString(errors, "GITHUB_CLIENT_SECRET"),
    },
    google: {
      clientId: getString(errors, "GOOGLE_CLIENT_ID"),
      clientSecret: getString(errors, "GOOGLE_CLIENT_SECRET"),
    },
    app: {
      publicUrl: getString(errors, "PUBLIC_APP_URL"),
      backendUrl: getString(errors, "BACKEND_URL"),
      mobileRedirectUri: getString(errors, "MOBILE_REDIRECT_URI"),
    },
    server: {
      port: getPort(errors, "PORT"),
      nodeEnv: getNodeEnv(errors, "NODE_ENV"),
    },
  };

  // Restore original process.env
  // @ts-expect-error — restoring the override
  process.env = original;

  if (errors.length > 0) {
    const lines = [
      "",
      "╔══════════════════════════════════════════════════════════════╗",
      "║         DevCard — Environment Configuration Error           ║",
      "╚══════════════════════════════════════════════════════════════╝",
      "",
      "The server cannot start because the following environment",
      "variable(s) are missing, empty, or invalid:",
      "",
      ...errors.map((e) => `  ✗  ${e.variable}: ${e.reason}`),
      "",
      "How to fix:",
      "  1. Copy .env.example to .env  →  cp .env.example .env",
      "  2. Fill in every value listed above",
      "  3. Restart the server",
      "",
    ];
    onError(lines.join("\n"));
  }

  return config;
}

// ─── Singleton (loaded once at startup) ──────────────────────────────────────

/**
 * The validated, fully-typed application configuration.
 *
 * Import this in any backend module that needs config values:
 *
 * ```ts
 * import { config } from "./config";
 *
 * const db = new PrismaClient({ datasources: { db: { url: config.database.url } } });
 * ```
 */
export const config: AppConfig = buildConfig();
