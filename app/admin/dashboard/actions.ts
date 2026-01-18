'use server';

import { createClient } from '@supabase/supabase-js';

// Use Service Role to ensure Admin Dashboard always loads data regardless of RLS complexity
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function fetchDashboardStats() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Run queries in parallel
        const [
            { count: candidatesCount },
            { count: aptitudeCount },
            { count: personalityCount },
            { count: postingsCount },
            { data: recentApps, error: appsError },
            { data: visitedLogs, count: totalVisits },
            { count: allTimeVisits }
        ] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }),
            supabase.from('questions').select('*', { count: 'exact', head: true }).eq('type', 'APTITUDE'),
            supabase.from('questions').select('*', { count: 'exact', head: true }).eq('type', 'PERSONALITY'),
            supabase.from('postings').select('*', { count: 'exact', head: true }),
            fetchRecentApplications(1), // Reuse internal helper logic? No, just inline it or make separate
            supabase.from('audit_logs')
                .select('timestamp, actor_id', { count: 'exact' })
                .eq('action', 'HOMEPAGE_VISIT')
                .gte('timestamp', thirtyDaysAgo.toISOString()),
            supabase.from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .eq('action', 'HOMEPAGE_VISIT')
        ]);

        if (appsError) throw appsError;

        return {
            success: true,
            data: {
                candidatesCount: candidatesCount || 0,
                aptitudeCount: aptitudeCount || 0,
                personalityCount: personalityCount || 0,
                postingsCount: postingsCount || 0,
                recentApps: recentApps || [],
                visitedLogs: visitedLogs || [],
                totalVisits: totalVisits || 0, // 30 days count
                allTimeVisits: allTimeVisits || 0
            }
        };

    } catch (error: any) {
        console.error('fetchDashboardStats Error:', error);
        return { success: false, error: error.message };
    }
}

async function fetchRecentApplications(page: number) {
    const ITEMS_PER_PAGE = 10;
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Use specific select to avoid massive payload
    return supabase.from('applications')
        .select('id, created_at, status, name, users(full_name), postings(title)')
        .order('created_at', { ascending: false })
        .range(from, to);
}

export async function fetchRecentAppsAction(page: number) {
    const { data, error } = await fetchRecentApplications(page);
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
