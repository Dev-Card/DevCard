-- CreateTable
CREATE TABLE "saved_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_cards_user_id_idx" ON "saved_cards"("user_id");

-- CreateIndex
CREATE INDEX "saved_cards_card_id_idx" ON "saved_cards"("card_id");

-- CreateIndex
CREATE INDEX "saved_cards_user_id_saved_at_idx" ON "saved_cards"("user_id", "saved_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_cards_user_id_card_id_key" ON "saved_cards"("user_id", "card_id");

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
