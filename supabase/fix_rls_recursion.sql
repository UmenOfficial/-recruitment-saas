-- ========================================================
-- FIX: RLS Infinite Recursion (get_user_role optimization)
-- ========================================================

-- 1. Fix get_user_role() to be robust against recursion
-- Using SECURITY DEFINER allows the function to run with the privileges of the creator (usually Postgres admin/supabase_admin),
-- bypassing the RLS on the `users` table itself.
-- Setting `search_path` is critical to prevent malicious hijacking of table names.

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_role text;
BEGIN
    -- Check if auth.uid() is null (not logged in)
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Direct query to users table, bypassing RLS due to SECURITY DEFINER
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();

    RETURN user_role;
END;
$$;

-- 2. Verify and potentially fix `users` table RLS
-- Recursion happens if `users` policy calls `get_user_role`, which calls `users` (loop).
-- With SECURITY DEFINER, the inner call to `users` ignores RLS, breaking the loop.
-- However, we must ensure the `users` policy itself is sane.

-- Example strict policy for users table (if not already present):
-- "Users can read their own data. Admins can read all data."
-- DROP POLICY IF EXISTS "Read own user data" ON public.users;
-- CREATE POLICY "Read own user data" ON public.users
--   FOR SELECT USING (auth.uid() = id);

-- DROP POLICY IF EXISTS "Admins read all user data" ON public.users;
-- CREATE POLICY "Admins read all user data" ON public.users
--   FOR SELECT USING (get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- 3. Optimization: Sync Role to Auth Metadata (Optional but Recommended)
-- This Trigger updates auth.users.raw_app_meta_data whenever public.users.role changes.
-- This allows using `auth.jwt() ->> 'user_role'` in RLS instead of querying the DB.

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

-- Drop trigger if exists to avoid duplication errors
DROP TRIGGER IF EXISTS trigger_sync_user_role ON public.users;

CREATE TRIGGER trigger_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_to_auth();
