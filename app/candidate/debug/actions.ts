'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function debugRLS() {
    try {
        // 1. Authenticated Client (RLS Applied)
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        // 2. Query with RLS
        const { count: rlsCount, data: rlsData, error: rlsError } = await supabase
            .from('test_results')
            .select('id, user_id, total_score', { count: 'exact' })
            .eq('user_id', user.id);

        // 3. Query with Service Role (RLS Bypassed)
        // Note: Using createClient directly with Service Key
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { count: dbCount, data: dbData, error: dbError } = await adminClient
            .from('test_results')
            .select('id, user_id, total_score', { count: 'exact' })
            .eq('user_id', user.id);

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            rls: {
                count: rlsCount,
                data: rlsData,
                error: rlsError
            },
            db: {
                count: dbCount,
                data: dbData,
                error: dbError
            },
            diagnosis: rlsCount !== dbCount
                ? 'CRITICAL: RLS mismatch detected. Database has more rows than visible.'
                : 'OK: RLS and Database counts match.'
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
