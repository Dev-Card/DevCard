import Fastify, { type FastifyInstance } from "fastify";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { refreshTokenCleanupPlugin } from "../plugins/refreshTokenCleanup.js";
import { cleanupExpiredAndRevokedTokens } from "../services/refreshTokenCleanupService.js";
import * as service from "../services/refreshTokenCleanupService.js";

import type { PrismaClient } from "@prisma/client";

describe("refreshTokenCleanupService", () => {
  const mockPrisma = {
    refreshToken: {
      deleteMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("active token survives (neither expired nor revoked are deleted)", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    const result = await cleanupExpiredAndRevokedTokens(
      mockPrisma as unknown as PrismaClient,
    );

    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    const callArgs = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];

    // Explicitly verify the query structure:
    // It must delete ONLY: revokedAt is not null OR expiresAt has passed (expiresAt < now)
    expect(callArgs?.where?.OR).toBeDefined();
    expect(callArgs.where.OR).toHaveLength(2);
    expect(callArgs.where.OR).toContainEqual({ revokedAt: { not: null } });
    expect(callArgs.where.OR[1].expiresAt.lt).toBeInstanceOf(Date);

    expect(result.deletedCount).toBe(0);
  });

  it("expired token deleted", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await cleanupExpiredAndRevokedTokens(mockPrisma as unknown as PrismaClient);

    const callArgs = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];

    expect(callArgs.where.OR).toContainEqual({
      expiresAt: {
        lt: expect.any(Date),
      },
    });
  });

  it("revoked token deleted", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await cleanupExpiredAndRevokedTokens(mockPrisma as unknown as PrismaClient);

    const callArgs = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];

    expect(callArgs.where.OR).toContainEqual({
      revokedAt: {
        not: null,
      },
    });
  });

  it("mixed dataset query contains both cleanup conditions", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

    await cleanupExpiredAndRevokedTokens(mockPrisma as unknown as PrismaClient);

    const callArgs = mockPrisma.refreshToken.deleteMany.mock.calls[0][0];

    expect(callArgs.where.OR).toHaveLength(2);
  });

  it("returns the exact count of deleted tokens reported by the database", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 15 });
    const result = await cleanupExpiredAndRevokedTokens(
      mockPrisma as unknown as PrismaClient,
    );
    expect(result.deletedCount).toBe(15);
  });

  it("empty dataset (table is empty, deleteMany returns 0)", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    const result = await cleanupExpiredAndRevokedTokens(
      mockPrisma as unknown as PrismaClient,
    );
    expect(result.deletedCount).toBe(0);
  });

  it("service error handling is propagated correctly", async () => {
    mockPrisma.refreshToken.deleteMany.mockRejectedValue(
      new Error("Database query timeout"),
    );
    await expect(
      cleanupExpiredAndRevokedTokens(mockPrisma as unknown as PrismaClient),
    ).rejects.toThrow("Database query timeout");
  });

  it("service is idempotent on multiple executions", async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    const run1 = await cleanupExpiredAndRevokedTokens(
      mockPrisma as unknown as PrismaClient,
    );
    const run2 = await cleanupExpiredAndRevokedTokens(
      mockPrisma as unknown as PrismaClient,
    );
    expect(run1.deletedCount).toBe(0);
    expect(run2.deletedCount).toBe(0);
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledTimes(2);
  });
});

describe("refreshTokenCleanupPlugin", () => {
  let app: FastifyInstance | null = null;
  const mockPrisma = {
    refreshToken: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    app = Fastify({ logger: { level: "error" } });
    app.decorate("prisma", mockPrisma as unknown as PrismaClient);
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (app) {
      await app.close();
      app = null;
    }
    delete process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS;
  });

  it("starts cleanup on register/startup and schedules interval", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 3,
        durationMs: 15,
      });

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "60000"; // 1 minute

    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    // Verification 1: startup cleanup run
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Verification 2: interval execution
    await vi.advanceTimersByTimeAsync(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(3);
  });

  it("invalid interval fallback (undefined)", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 0,
        durationMs: 1,
      });

    delete process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS;

    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    expect(cleanupSpy).toHaveBeenCalledTimes(1); // startup

    // Should not run at 1 minute
    await vi.advanceTimersByTimeAsync(60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Should run at 24 hours (86400000ms)
    await vi.advanceTimersByTimeAsync(86400000 - 60000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("invalid interval fallback (NaN)", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 0,
        durationMs: 1,
      });

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "not-a-number";

    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    // Startup run
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Should fallback to 24 hours
    await vi.advanceTimersByTimeAsync(86400000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("invalid interval fallback (<= 0)", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 0,
        durationMs: 1,
      });

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "0";

    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    // Startup run
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Should fallback to 24 hours
    await vi.advanceTimersByTimeAsync(86400000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("invalid interval fallback (Infinity)", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 0,
        durationMs: 1,
      });

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "Infinity";

    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    // Startup run
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Should fallback to 24 hours
    await vi.advanceTimersByTimeAsync(86400000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("startup cleanup failure logs error but does not crash app or stop scheduler", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockRejectedValue(new Error("Connection failure"));

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "5000";

    await app!.register(refreshTokenCleanupPlugin);

    // app!.ready() should resolve successfully without throwing
    await expect(app!.ready()).resolves.toBeDefined();
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Scheduler should still function
    cleanupSpy.mockResolvedValue({ deletedCount: 0, durationMs: 1 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("scheduled cleanup failure logs error but does not crash process", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 0,
        durationMs: 1,
      });

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "5000";

    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Fail during scheduled run
    cleanupSpy.mockRejectedValue(new Error("Transaction deadlock"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);

    // Next run works again
    cleanupSpy.mockResolvedValue({ deletedCount: 1, durationMs: 1 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(cleanupSpy).toHaveBeenCalledTimes(3);
  });

  it("shutdown clears interval and avoids timer leaks", async () => {
    const cleanupSpy = vi
      .spyOn(service, "cleanupExpiredAndRevokedTokens")
      .mockResolvedValue({
        deletedCount: 0,
        durationMs: 1,
      });

    process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS = "1000";
    await app!.register(refreshTokenCleanupPlugin);
    await app!.ready();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    await app!.close();
    app = null;

    // Advance timer: should not be called again because onClose hook cleared it
    await vi.advanceTimersByTimeAsync(5000);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});
