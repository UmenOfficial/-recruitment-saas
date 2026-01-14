import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { logAuditEvent } from '@/lib/audit';

// This endpoint should be triggered by a Cron Job (e.g., Vercel Cron or Supabase Edge Function)
// For MVP, we expose it as an API that can be curled.
// CRON Schedule: Daily (e.g., 0 0 * * *)

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Auth Check: Verify it's called by a trusted service (Header Secret)
        const authHeader = request.headers.get('x-cron-secret');
        if (authHeader !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Identify Expired Applications 
        // Logic: created_at < NOW - data_retention_days (from postings settings) 
        // OR default if not set.

        // We join applications -> postings to get retention period.
        // For MVP, let's use a global policy: 180 Days.
        const RETENTION_DAYS = 180;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        // 2. Soft Delete or Hard Delete PII?
        // PIPA requires "Irreversible Destruction". 
        // We will wipe PII columns but keep anonymized stats if needed, or delete row.
        // Let's HARD DELETE rows for strict compliance.

        const { data: expiredApps, error: fetchError } = await supabase
            .from('applications')
            .select('id')
            .lt('created_at', cutoffDate.toISOString());

        if (fetchError) throw fetchError;

        // Safely handle array
        const appsToDelete = expiredApps || [];
        const count = appsToDelete.length;

        if (count > 0) {
            const ids = appsToDelete.map((a: any) => a.id);

            // Perform Delete
            const { error: deleteError } = await supabase
                .from('applications')
                .delete()
                .in('id', ids);

            if (deleteError) throw deleteError;

            // Log this system event
            await logAuditEvent('SYSTEM', 'DATA_RETENTION_CLEANUP', 'applications', { count, deleted_ids: ids });
        }

        return NextResponse.json({ success: true, deleted_count: count });

    } catch (error: any) {
        console.error('Cleanup Job Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
