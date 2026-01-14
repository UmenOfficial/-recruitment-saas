-- Migration: Add new values to application_status enum
-- We need to add: SUBMITTED, DOCUMENT_PASS, TEST_PASS, INTERVIEW_PASS, HIRED, REJECTED
-- Existing: APPLIED, TEST_PENDING, TEST_COMPLETED, INTERVIEW, PASS, FAIL, WITHDRAWN

-- Note: 'APPLIED' is effectively 'SUBMITTED'. We can keep APPLIED or map it.
-- Let's keep existing values to avoid data loss, and add new ones.

ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'DOCUMENT_PASS';
ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'TEST_PASS';
ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'INTERVIEW_PASS';
ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'HIRED';
ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Optional: Map old statuses to new ones if needed (Application logic will handle compatibility)
-- APPLIED -> SUBMITTED
-- PASS -> HIRED (or stage specific)
-- FAIL -> REJECTED
