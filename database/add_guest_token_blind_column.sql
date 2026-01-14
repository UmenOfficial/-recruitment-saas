-- Add is_masked column to guest_access_tokens
-- Default is TRUE (Blind Mode)
ALTER TABLE "guest_access_tokens" ADD COLUMN IF NOT EXISTS "is_masked" BOOLEAN DEFAULT TRUE;
