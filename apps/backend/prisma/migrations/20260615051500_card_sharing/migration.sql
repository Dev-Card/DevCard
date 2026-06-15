CREATE TYPE "CardVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

ALTER TABLE "cards"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "visibility" "CardVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "qr_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "cards"
SET "slug" = concat(
  trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')),
  '-',
  substring("id" from 1 for 8)
)
WHERE "slug" IS NULL;

ALTER TABLE "cards"
  ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");
CREATE INDEX "cards_user_id_idx" ON "cards"("user_id");
CREATE INDEX "cards_view_count_idx" ON "cards"("view_count");
CREATE INDEX "card_views_card_id_idx" ON "card_views"("card_id");
CREATE INDEX "card_views_owner_id_idx" ON "card_views"("owner_id");
