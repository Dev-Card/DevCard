-- DropIndex
DROP INDEX "cards_slug_idx";

-- CreateIndex
CREATE INDEX "card_views_card_id_idx" ON "card_views"("card_id");

-- CreateIndex
CREATE INDEX "card_views_owner_id_idx" ON "card_views"("owner_id");

-- CreateIndex
CREATE INDEX "cards_user_id_idx" ON "cards"("user_id");
