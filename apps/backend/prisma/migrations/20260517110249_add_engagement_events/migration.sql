-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PROFILE_VIEW', 'CARD_VIEW', 'LINK_CLICK', 'FOLLOW_ATTEMPT', 'FOLLOW_SUCCESS', 'QR_SCAN', 'SHARE_ACTION', 'COPY_LINK');

-- CreateTable
CREATE TABLE "engagement_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewer_id" TEXT,
    "card_id" TEXT,
    "event_type" "EventType" NOT NULL,
    "platform" TEXT,
    "source" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engagement_events_user_id_idx" ON "engagement_events"("user_id");

-- CreateIndex
CREATE INDEX "engagement_events_event_type_idx" ON "engagement_events"("event_type");

-- CreateIndex
CREATE INDEX "engagement_events_created_at_idx" ON "engagement_events"("created_at");

-- CreateIndex
CREATE INDEX "engagement_events_user_id_event_type_idx" ON "engagement_events"("user_id", "event_type");

-- AddForeignKey
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
