-- =====================================================
-- Admin Role Fix & RLS Enforcement
-- Ensures 'admin@umen.cloud' is recognized as ADMIN in the database.
-- =====================================================

BEGIN;

-- 1. Promote User to ADMIN
UPDATE public.users
SET role = 'ADMIN'
WHERE email = 'admin@umen.cloud';

-- 2. Verify Role Update (Optional: will output if run in dashboard)
-- SELECT id, email, role FROM public.users WHERE email = 'admin@umen.cloud';

COMMIT;
