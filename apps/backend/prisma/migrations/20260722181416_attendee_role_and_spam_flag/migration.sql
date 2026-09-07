-- CreateEnum
CREATE TYPE "AttendeeRole" AS ENUM ('PARTICIPANT', 'ORGANIZER', 'MENTOR');

-- AlterTable
ALTER TABLE "event_attendees" ADD COLUMN     "role" "AttendeeRole" NOT NULL DEFAULT 'PARTICIPANT',
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "event_attendees_userId_joinedAt_idx" ON "event_attendees"("userId", "joinedAt");
