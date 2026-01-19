# Supabase RLS Best Practices & Recursion Fix

## 1. The Fix: `SECURITY DEFINER`
The Infinite Recursion error (`42P17`) occurs because:
1.  Policy A on `Table X` calls `get_user_role()`.
2.  `get_user_role()` queries `public.users`.
3.  `public.users` has Policy B that *also* calls `get_user_role()` (or does a self-lookup that triggers another policy).
4.  Infinite Loop.

**Solution:**
We use `SECURITY DEFINER` on `get_user_role()`.
-   **What it does:** Runs the function with the privileges of the *function creator* (usually the Superuser or Database Owner), NOT the current user.
-   **Why it fixes recursion:** When the function queries `public.users`, it ignores RLS policies completely because the Owner has bypass privileges. The loop is broken at step 3.

**Crucial Safety Note:**
Always include `SET search_path = public` (or specific schemas) in `SECURITY DEFINER` functions. Without this, a malicious user could create a table named `users` in their own schema and trick the function into reading it.

### SQL Implementation
(See `supabase/fix_rls_recursion.sql`)

```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER          -- <--- The Magic Fix
SET search_path = public  -- <--- The Safety Fix
AS $$
BEGIN
    RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$;
```

---

## 2. Optimization: Custom Claims (JWT)
Querying the `users` table for *every* row in *every* table (via RLS) is expensive.
A better approach is to store the role inside the user's JWT (JSON Web Token).

**How it works:**
1.  **Trigger:** When `public.users.role` changes, a Trigger updates `auth.users.raw_app_meta_data`.
2.  **Login:** Supabase generates a JWT including `app_metadata: { user_role: "ADMIN" }`.
3.  **RLS:** Policies read the JWT directly from memory. Zero DB lookups.

**Policy Example:**
```sql
-- OLD (Slow, Recursion Risk)
USING (get_user_role() = 'ADMIN')

-- NEW (Fast, No DB Hit)
USING ((auth.jwt() ->> 'user_role') = 'ADMIN')
```

**Implementation Steps:**
1.  Run the Trigger SQL provided in `supabase/fix_rls_recursion.sql`.
2.  Manually update existing users (run the `UPDATE` statement once manually).
3.  Update your RLS policies to use `auth.jwt()`.

---

## 3. Admin Dashboard Architecture
**Question:** Should Client-side RLS handle Admin logic, or should we use Service Role?

**Recommendation: Hybrid Approach**

1.  **For High-Security / Bulk Data (Admin Dashboard):**
    -   **Use Server Components + Service Role.**
    -   **Why?** RLS is great, but fetching 10,000 candidate records via RLS involves 10,000 policy checks. It's slower.
    -   **How:** In `app/admin/...`, check the user's role *explicitly* in the code (e.g., `if (user.role !== 'ADMIN') throw error`), then use `supabase.createClient(..., service_role_key)` to fetch data without RLS overhead.

2.  **For User-Facing Features:**
    -   **Use RLS.**
    -   **Why?** Users need to be sandboxed to their own data. RLS is the safest way to ensure no data leaks even if the application logic fails.

**Summary:**
-   **Admin Panel:** Use `Service Role` (with strict role checks in code).
-   **User App:** Use `RLS` (with the JWT optimization).
