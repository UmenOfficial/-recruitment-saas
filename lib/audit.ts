import { createServerSupabaseClient } from '@/lib/supabase/server';

// PIPA Requirement: Log who accessed what, when, and from where.
// Usage: await logAuditEvent(userId, 'VIEW_CANDIDATE', candidateId, ipAddress);

export async function logAuditEvent(
    actor_id: string | null, // The user performing action (or 'GUEST:' + token)
    action: string, // VIEW, EXPORT, DELETE, LOGIN
    target_resource: string, // Table name or Resource ID
    details: Record<string, unknown> = {},
    ip_address: string = 'unknown' // In Next.js, get from headers
) {
    try {
        const supabase = await createServerSupabaseClient();

        // actor_id in schema is likely UUID 'auth.users'. If we have a non-UUID actor (like 'SYSTEM'), 
        // we should store it in details or make actor_id nullable.
        // Safe approach: If actor_id looks like a UUID, use it. Else, put in details.

        // Simple regex for UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor_id || '');

        const dbActorId = isUUID ? actor_id : null;
        const finalDetails = { ...details, original_actor: !isUUID ? actor_id : undefined };

        // NOTE: TypeScript here might complain if the auto-generated types for 'insert' expect strict shape.
        // We cast to 'any' for the insert payload to avoid fighting the generated types during this quick fix phase.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
            actor_id: dbActorId,
            action,
            target_resource,
            details: finalDetails,
            ip_address
        };

        const { error } = await supabase.from('audit_logs').insert(payload);

        if (error) console.error('Audit Log Failed:', error);

    } catch (err) {
        console.error('Audit Log Exception:', err);
    }
}
