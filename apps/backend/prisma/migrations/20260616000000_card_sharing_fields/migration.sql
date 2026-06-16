-- CreateEnum
CREATE TYPE "CardVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "description" TEXT,
ADD COLUMN     "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibility" "CardVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "card_views_card_id_idx" ON "card_views"("card_id");

-- CreateIndex
CREATE INDEX "card_views_owner_id_idx" ON "card_views"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");

-- CreateIndex
CREATE INDEX "cards_user_id_idx" ON "cards"("user_id");

-- CreateIndex
CREATE INDEX "cards_viewCount_idx" ON "cards"("viewCount");

