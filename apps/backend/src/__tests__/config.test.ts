/**
 * @file config.test.ts
 * @description Unit tests for the environment config validation module.
 *
 * Run with: pnpm --filter @devcard/backend test
 */

import { describe, it, expect, vi } from "vitest";
import { buildConfig } from "../config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A complete, valid set of environment variables mirroring .env.example values. */
const VALID_ENV: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgresql://devcard:devcard@localhost:5432/devcard?schema=public",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "a-very-long-and-secure-jwt-secret-value-for-testing-purposes",
  ENCRYPTION_KEY: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  GITHUB_CLIENT_ID: "real-github-client-id",
  GITHUB_CLIENT_SECRET: "real-github-client-secret-value",
  GOOGLE_CLIENT_ID: "real-google-client-id",
  GOOGLE_CLIENT_SECRET: "real-google-client-secret-value",
  PUBLIC_APP_URL: "http://localhost:5173",
  BACKEND_URL: "http://localhost:3000",
  MOBILE_REDIRECT_URI: "devcard://oauth/callback",
  PORT: "3000",
  NODE_ENV: "test",
};

function buildWithOverride(overrides: Partial<NodeJS.ProcessEnv>): ReturnType<typeof buildConfig> {
  const onError = vi.fn((_msg: string): never => {
    throw new Error(_msg);
  });
  return buildConfig({ ...VALID_ENV, ...overrides }, onError as never);
}

function expectError(env: Partial<NodeJS.ProcessEnv>, expectedSnippet: string) {
  let capturedMessage = "";
  const onError = vi.fn((msg: string): never => {
    capturedMessage = msg;
    throw new Error(msg);
  });

  expect(() => buildConfig({ ...VALID_ENV, ...env } as NodeJS.ProcessEnv, onError as never)).toThrow();
  expect(capturedMessage).toContain(expectedSnippet);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildConfig — happy path", () => {
  it("returns a typed config object when all variables are valid", () => {
    const cfg = buildWithOverride({});
    expect(cfg.database.url).toBe(VALID_ENV.DATABASE_URL);
    expect(cfg.redis.url).toBe(VALID_ENV.REDIS_URL);
    expect(cfg.jwt.secret).toBe(VALID_ENV.JWT_SECRET);
    expect(cfg.encryption.key).toBe(VALID_ENV.ENCRYPTION_KEY);
    expect(cfg.github.clientId).toBe(VALID_ENV.GITHUB_CLIENT_ID);
    expect(cfg.github.clientSecret).toBe(VALID_ENV.GITHUB_CLIENT_SECRET);
    expect(cfg.google.clientId).toBe(VALID_ENV.GOOGLE_CLIENT_ID);
    expect(cfg.google.clientSecret).toBe(VALID_ENV.GOOGLE_CLIENT_SECRET);
    expect(cfg.app.publicUrl).toBe(VALID_ENV.PUBLIC_APP_URL);
    expect(cfg.app.backendUrl).toBe(VALID_ENV.BACKEND_URL);
    expect(cfg.app.mobileRedirectUri).toBe(VALID_ENV.MOBILE_REDIRECT_URI);
    expect(cfg.server.port).toBe(3000);
    expect(cfg.server.nodeEnv).toBe("test");
  });

  it("trims whitespace from values", () => {
    const cfg = buildWithOverride({ REDIS_URL: "  redis://localhost:6379  " });
    expect(cfg.redis.url).toBe("redis://localhost:6379");
  });

  it("defaults NODE_ENV to development when not set", () => {
    const env = { ...VALID_ENV };
    delete env.NODE_ENV;
    const onError = vi.fn((_: string): never => { throw new Error(_); });
    const cfg = buildConfig(env, onError as never);
    expect(cfg.server.nodeEnv).toBe("development");
  });
});

describe("buildConfig — missing variables", () => {
  it("exits when DATABASE_URL is missing", () => {
    const env = { ...VALID_ENV };
    delete env.DATABASE_URL;
    expectError(env, "DATABASE_URL");
  });

  it("exits when REDIS_URL is missing", () => {
    const env = { ...VALID_ENV };
    delete env.REDIS_URL;
    expectError(env, "REDIS_URL");
  });

  it("exits when JWT_SECRET is missing", () => {
    const env = { ...VALID_ENV };
    delete env.JWT_SECRET;
    expectError(env, "JWT_SECRET");
  });

  it("exits when ENCRYPTION_KEY is missing", () => {
    const env = { ...VALID_ENV };
    delete env.ENCRYPTION_KEY;
    expectError(env, "ENCRYPTION_KEY");
  });

  it("exits when GITHUB_CLIENT_ID is missing", () => {
    const env = { ...VALID_ENV };
    delete env.GITHUB_CLIENT_ID;
    expectError(env, "GITHUB_CLIENT_ID");
  });

  it("exits when GITHUB_CLIENT_SECRET is missing", () => {
    const env = { ...VALID_ENV };
    delete env.GITHUB_CLIENT_SECRET;
    expectError(env, "GITHUB_CLIENT_SECRET");
  });

  it("exits when GOOGLE_CLIENT_ID is missing", () => {
    const env = { ...VALID_ENV };
    delete env.GOOGLE_CLIENT_ID;
    expectError(env, "GOOGLE_CLIENT_ID");
  });

  it("exits when GOOGLE_CLIENT_SECRET is missing", () => {
    const env = { ...VALID_ENV };
    delete env.GOOGLE_CLIENT_SECRET;
    expectError(env, "GOOGLE_CLIENT_SECRET");
  });

  it("exits when PORT is missing", () => {
    const env = { ...VALID_ENV };
    delete env.PORT;
    expectError(env, "PORT");
  });

  it("collects multiple missing variables into a single error message", () => {
    const env = { ...VALID_ENV };
    delete env.DATABASE_URL;
    delete env.JWT_SECRET;
    delete env.GITHUB_CLIENT_SECRET;

    let capturedMessage = "";
    const onError = vi.fn((msg: string): never => {
      capturedMessage = msg;
      throw new Error(msg);
    });
    expect(() => buildConfig(env as NodeJS.ProcessEnv, onError as never)).toThrow();
    expect(capturedMessage).toContain("DATABASE_URL");
    expect(capturedMessage).toContain("JWT_SECRET");
    expect(capturedMessage).toContain("GITHUB_CLIENT_SECRET");
  });
});

describe("buildConfig — empty values", () => {
  it("exits when JWT_SECRET is an empty string", () => {
    expectError({ JWT_SECRET: "" }, "JWT_SECRET");
  });

  it("exits when DATABASE_URL is only whitespace", () => {
    expectError({ DATABASE_URL: "   " }, "DATABASE_URL");
  });
});

describe("buildConfig — placeholder values", () => {
  it("rejects JWT_SECRET that starts with 'your-'", () => {
    expectError(
      { JWT_SECRET: "your-super-secret-jwt-key-change-in-production" },
      "JWT_SECRET"
    );
  });

  it("rejects ENCRYPTION_KEY that ends with '-here'", () => {
    expectError(
      { ENCRYPTION_KEY: "your-32-byte-hex-encryption-key-here" },
      "ENCRYPTION_KEY"
    );
  });

  it("rejects GITHUB_CLIENT_ID that starts with 'your-'", () => {
    expectError({ GITHUB_CLIENT_ID: "your-github-client-id" }, "GITHUB_CLIENT_ID");
  });

  it("rejects GOOGLE_CLIENT_SECRET that starts with 'your-'", () => {
    expectError({ GOOGLE_CLIENT_SECRET: "your-google-client-secret" }, "GOOGLE_CLIENT_SECRET");
  });
});

describe("buildConfig — minimum length constraints", () => {
  it("rejects JWT_SECRET shorter than 32 characters", () => {
    expectError({ JWT_SECRET: "short-secret" }, "JWT_SECRET");
  });

  it("accepts JWT_SECRET of exactly 32 characters", () => {
    const cfg = buildWithOverride({ JWT_SECRET: "a".repeat(32) });
    expect(cfg.jwt.secret).toHaveLength(32);
  });

  it("rejects ENCRYPTION_KEY shorter than 32 characters", () => {
    expectError({ ENCRYPTION_KEY: "tooshort" }, "ENCRYPTION_KEY");
  });
});

describe("buildConfig — PORT validation", () => {
  it("rejects a non-numeric PORT", () => {
    expectError({ PORT: "abc" }, "PORT");
  });

  it("rejects PORT 0", () => {
    expectError({ PORT: "0" }, "PORT");
  });

  it("rejects PORT above 65535", () => {
    expectError({ PORT: "99999" }, "PORT");
  });

  it("accepts a valid PORT", () => {
    const cfg = buildWithOverride({ PORT: "8080" });
    expect(cfg.server.port).toBe(8080);
  });
});

describe("buildConfig — NODE_ENV validation", () => {
  it("rejects an unknown NODE_ENV value", () => {
    expectError({ NODE_ENV: "staging" }, "NODE_ENV");
  });

  it("accepts production", () => {
    const cfg = buildWithOverride({ NODE_ENV: "production" });
    expect(cfg.server.nodeEnv).toBe("production");
  });
});

describe("buildConfig — error message quality", () => {
  it("includes setup instructions in the error output", () => {
    const env = { ...VALID_ENV };
    delete env.DATABASE_URL;
    let msg = "";
    const onError = vi.fn((m: string): never => { msg = m; throw new Error(m); });
    expect(() => buildConfig(env as NodeJS.ProcessEnv, onError as never)).toThrow();
    expect(msg).toContain("cp .env.example .env");
    expect(msg).toContain("How to fix");
  });
});
