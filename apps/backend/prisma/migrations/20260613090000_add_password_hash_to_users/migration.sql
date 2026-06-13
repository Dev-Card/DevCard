-- Add nullable password storage for local credential authentication.
-- OAuth-only accounts can continue to exist without a password hash.
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
