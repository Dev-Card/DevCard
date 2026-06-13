-- Migration: follow_log_idempotency
-- Adds a unique constraint on (follower_id, target_username, platform) to prevent
-- duplicate follow log entries. Also adds updated_at for upsert support.
--
-- Safety: deduplicates any existing rows before creating the index so the
-- constraint never fails on a populated database.

-- Step 1: add updated_at column (nullable initially, backfilled, then NOT NULL)
ALTER TABLE "follow_logs" ADD COLUMN "updated_at" TIMESTAMP(3);

-- Step 2: backfill updated_at from created_at for all existing rows
UPDATE "follow_logs" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- Step 3: make updated_at NOT NULL now that every row has a value
ALTER TABLE "follow_logs" ALTER COLUMN "updated_at" SET NOT NULL;

-- Step 4: deduplicate — keep the most-recent row per (follower_id, target_username, platform)
DELETE FROM "follow_logs"
WHERE id NOT IN (
  SELECT DISTINCT ON (follower_id, target_username, platform) id
  FROM "follow_logs"
  ORDER BY follower_id, target_username, platform, created_at DESC
);

-- Step 5: add the unique constraint
CREATE UNIQUE INDEX "follow_logs_follower_id_target_username_platform_key"
  ON "follow_logs"("follower_id", "target_username", "platform");
