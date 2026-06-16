/*
  Warnings:

  - You are about to drop the column `description` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `qrEnabled` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `cards` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `cards` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "card_views_card_id_idx";

-- DropIndex
DROP INDEX "card_views_owner_id_idx";

-- DropIndex
DROP INDEX "cards_slug_key";

-- DropIndex
DROP INDEX "cards_user_id_idx";

-- DropIndex
DROP INDEX "cards_viewCount_idx";

-- AlterTable
ALTER TABLE "cards" DROP COLUMN "description",
DROP COLUMN "qrEnabled",
DROP COLUMN "slug",
DROP COLUMN "viewCount",
DROP COLUMN "visibility";

-- DropEnum
DROP TYPE "CardVisibility";
