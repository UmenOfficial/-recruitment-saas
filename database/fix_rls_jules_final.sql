-- =====================================================================
-- FINAL FIX: RLS Recursion & Optimization (Based on Jules' Solution)
-- =====================================================================

-- 1. Secure `get_user_role` (Breaks Recursion)
-- SECURITY DEFINER: Runs with privileges of the creator (bypass RLS)
-- search_path: Prevents search path hijacking
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Directly query users table. RLS is ignored due to SECURITY DEFINER.
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role;
END;
$$;

-- 2. Optimization: Sync Role to Auth Metadata (Performance)
-- Allows potentially using auth.jwt() ->> 'user_role' in future policies
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = 
        coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('user_role', NEW.role)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_user_role ON public.users;
CREATE TRIGGER trigger_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_to_auth();

-- 3. Reset Policies (Apply the Fix)

-- 3.1 Users Table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Clean up old recursive/broken policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- Re-apply Correct Policies
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT USING (get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));


-- 3.2 Test Results Table
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Clean up
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
DROP POLICY IF EXISTS "Admins can view all test results" ON public.test_results;
DROP POLICY IF EXISTS "DEBUG_OPEN_ACCESS" ON public.test_results;

-- Re-apply Correct Policies
CREATE POLICY "Users can view own test results" 
ON public.test_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all test results" 
ON public.test_results FOR SELECT USING (get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));
