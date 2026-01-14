
-- ========================================================
-- SUPABASE SECURITY ADVISOR FIX SCRIPT
-- ========================================================

-- 1. [CRITICAL] Enable Row Level Security (RLS)
-- The "RLS Disabled" error means policies exist but aren't enforced.
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_norm_versions ENABLE ROW LEVEL SECURITY;
-- Also auditing table if exists
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 2. [WARNING] Fix Function Search Path (Mutable Search Path)
-- Security Best Practice: Explicitly set search_path to 'public' for SECURITY DEFINER functions.

-- Fix 'handle_new_user' (Trigger function)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Fix 'check_recusal_reason' (Trigger function)
-- Note: Assuming signature matches what was seen in files
ALTER FUNCTION public.check_recusal_reason() SET search_path = public;

-- Fix 'seed_notification_template' (if exists, from snapshot)
-- We use DO block to avoid error if function doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_notification_template') THEN
        ALTER FUNCTION public.seed_notification_template() SET search_path = public;
    END IF;
END $$;
