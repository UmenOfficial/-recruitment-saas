'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function trackVisit() {
    // 1. Get current user (if any) using standard client (cookies)
    let actorId = null;
    try {
        const userClient = await createServerSupabaseClient();
        const { data: { user } } = await userClient.auth.getUser();
        if (user) actorId = user.id;
    } catch (e) {
        // Ignore auth errors (no session)
    }

    // 2. Use Service Role Key to bypass RLS for logging to audit_logs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP address if possible (best effort)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || null;

    try {
        await supabase.from('audit_logs').insert({
            action: 'HOMEPAGE_VISIT',
            actor_id: actorId, // UUID or null
            ip_address: ip.split(',')[0], // Take first IP if multiple
            user_agent: userAgent,
            details: { page: '/' },
            timestamp: new Date().toISOString()
        } as any);
    } catch (error) {
        console.error('Failed to log visit:', error);
        // Fail silently to not impact user
    }
}
