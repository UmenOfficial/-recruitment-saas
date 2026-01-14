-- Fix for: new row for relation "applications" violates check constraint "applications_status_check"
-- This script replaces the outdated check constraint with one that includes all new ATS statuses.

ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "applications_status_check";

ALTER TABLE "applications" ADD CONSTRAINT "applications_status_check"
CHECK (status IN (
    'APPLIED',
    'TEST_PENDING',
    'TEST_COMPLETED',
    'INTERVIEW',
    'PASS',
    'FAIL',
    'WITHDRAWN',
    'SUBMITTED',
    'DOCUMENT_PASS',
    'TEST_PASS',
    'INTERVIEW_PASS',
    'HIRED',
    'REJECTED'
));
