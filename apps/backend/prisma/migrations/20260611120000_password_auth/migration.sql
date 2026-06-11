-- Add nullable password storage for email/password accounts.
-- Existing OAuth and seeded users keep working without a password hash.
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
