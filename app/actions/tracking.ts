'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function trackVisit() {
    const supabase = await createServerSupabaseClient();

    // Get IP address if possible (best effort)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || null;

    try {
        await supabase.from('audit_logs').insert({
            action: 'HOMEPAGE_VISIT',
            actor_id: null, // Anonymous
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
