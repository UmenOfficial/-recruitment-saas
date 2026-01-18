'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Service Role Client for Admin Data Access (Bypassing RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
                    // Server Actions: mostly read needed here.
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
                userRole: userData?.role || 'USER',
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

export async function fetchPostingDetailAction(id: string) {
    try {
        const { data: posting, error } = await supabase
            .from('postings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data: posting };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchActiveTestsAction() {
    try {
        const { data: tests, error } = await supabase
            .from('tests')
            .select('id, title, type')
            .neq('status', 'DRAFT')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: tests };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updatePostingAction(id: string, updates: any) {
    try {
        const { error } = await supabase
            .from('postings')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        revalidatePath(`/admin/postings/${id}`);
        revalidatePath('/admin/postings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePostingAction(id: string) {
    try {
        const { error } = await supabase.from('postings').delete().eq('id', id);
        if (error) throw error;
        revalidatePath('/admin/postings');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
