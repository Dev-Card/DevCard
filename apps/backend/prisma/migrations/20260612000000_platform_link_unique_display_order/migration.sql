-- Add unique constraint on (user_id, display_order) to prevent duplicate display orders per user
CREATE UNIQUE INDEX "platform_links_user_id_display_order_key" ON "platform_links"("user_id", "display_order");
