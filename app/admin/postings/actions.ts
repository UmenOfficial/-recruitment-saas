'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch Postings and User Status Securely
 */
export async function fetchPostingsAndUserStatus() {
    try {
        const authSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false,
                }
                // We need to pass the session, but since we are in a server action called from Client Component,
                // we might not have the session easily unless passed or using cookies.
                // However, 'createClient' above is Service Role. We can use that for data.
                // For Auth User, we depend on the caller or use headers if using SSR.
                // Let's assume we need to verify the user.
                // Best practice: Use `createServerClient` with cookies, but for now we are using Service Role for data.
                // We need to know WHO the user is. 
                // The standard way in this project's server actions (so far) has been relying on the calling context 
                // validation or assuming public/protected routes handle auth.
                // BUT, for `auth.getUser()`, we need the user's token.
                // In Server Actions, we can use `cookies()` to get the session if we use `createServerClient`.
                // FOR SIMPLICITY and Consistency with previous `getUserSession` in community/actions:
                // We'll rely on `supabase.auth.getUser()` if we had the cookie client.

                // However, the Service Role client `supabase` defined at top has NO context of the user.
                // We must NOT use `auth.getUser()` on the Service Role client without a token.

                // Alternative: Pass nothing? 
                // Actually, `fetchPostings` is public? No, Admin page.
                // Let's stick to the pattern:
                // 1. We assume the user is authenticated (Middleware protects /admin).
                // 2. We use Service Role to fetch Admin Data.
                // 3. To get the CURRENT user's ID to check roles, we need `createServerClient` flow 
                //    OR rely on the client passing the ID (insecure).
                //    OR use `import { cookies } from 'next/headers'` and make a scoped client.
            }
        );

        // Wait, the previous actions (e.g. candidates/actions.ts) didn't check auth user inside?
        // Let's check `candidates/actions.ts`.
        // It fetches ALL data. It trusts the caller (Middleware protection).
        // `fetchCandidatesList` just does `supabase.from...`.

        // So for this Refactor:
        // We will fetch ALL postings (Admin View).
        // But we DO need to return the user's role/company for the UI logic.

        // To safely get the current user in a Server Action:
        // We really should use `createServerComponentClient` pattern or `cookies`.
        // Let's try to use `cookies` from `next/headers` to get the authorized user ID via Supabase Auth.
    } catch (e) {
        // ...
    }
}

// Re-defining with proper Auth Context
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Helper to get User-Scoped Supabase Client (for Auth Check)
async function createActionClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    // Server Actions can't set cookies easily in all cases, but mostly read needed here.
                },
                remove(name: string, options: CookieOptions) {
                },
            },
        }
    );
}

export async function fetchAdminPostingsPageData() {
    try {
        const actionClient = await createActionClient();
        const { data: { user }, error: authError } = await actionClient.auth.getUser();

        if (!user || authError) {
            console.error("No authenticated user");
            return { success: false, error: 'Unauthorized' };
        }

        // Use SERVICE_ROLE for DB Access to avoid RLS
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const { data: memberData } = await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        const { data: postings, error: postError } = await supabase
            .from('postings')
            .select('*')
            .order('created_at', { ascending: false });

        if (postError) throw postError;

        return {
            success: true,
            data: {
                userRole: userData?.role || 'USER', // Default to USER, do NOT auto-upgrade to SUPER_ADMIN
                companyId: memberData?.company_id || null,
                postings: postings || []
            }
        };

    } catch (error: any) {
        console.error('fetchAdminPostingsPageData Error:', error);
        return { success: false, error: error.message };
    }
}

export async function createPostingAction(title: string, companyId: string | null) {
    try {
        const actionClient = await createActionClient();
        const { data: { user } } = await actionClient.auth.getUser();

        if (!user) return { success: false, error: 'Unauthorized' };

        // Verify Role/Permission via Service Role
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const userRole = userData?.role;

        // Validation Logic from client
        if (!companyId && userRole !== 'SUPER_ADMIN') {
            return { success: false, error: '회사 정보를 찾을 수 없습니다.' };
        }

        const { error } = await supabase.from('postings').insert({
            title,
            company_id: companyId,
            jds: "{}",
            is_active: true
        });

        if (error) throw error;

        revalidatePath('/admin/postings');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
