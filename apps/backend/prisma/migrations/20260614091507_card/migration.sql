/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `cards` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `cards` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CardVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "description" TEXT,
ADD COLUMN     "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibility" "CardVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");

-- CreateIndex
CREATE INDEX "cards_slug_idx" ON "cards"("slug");

-- CreateIndex
CREATE INDEX "cards_viewCount_idx" ON "cards"("viewCount");
