import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Auth Check: Verify Admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { posting_id, guest_email, guest_name, stage, is_masked = true, expires_in_days = 7 } = body;

        if (!posting_id || !guest_email) {
            return NextResponse.json({ error: 'Posting ID and Guest Email are required' }, { status: 400 });
        }

        // Generate secure token
        const token = uuidv4();
        const expiresAt = addDays(new Date(), expires_in_days).toISOString();

        // Insert into guest_access_tokens
        const { data, error } = await (supabase
            .from('guest_access_tokens') as any)
            .insert({
                token,
                posting_id,
                expires_at: expiresAt,
                created_by: user.id,
                is_masked
            })
            .select()
            .single();

        if (error) throw error;

        // Generate Invite Link
        // Robust base URL detection
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!baseUrl) {
            const host = request.headers.get('host');
            const protocol = host?.includes('localhost') ? 'http' : 'https';
            baseUrl = `${protocol}://${host}`;
        }

        // Ensure no trailing slash
        baseUrl = baseUrl?.replace(/\/$/, '');

        const inviteLink = `${baseUrl}/guest/login?token=${token}`;

        // MOCK EMAIL SENDING
        console.log(`[Email Mock] Sending invite to ${guest_name} <${guest_email}>: ${inviteLink}`);

        return NextResponse.json({
            success: true,
            token,
            inviteLink,
            expiresAt,
            message: 'Email sent successfully (Simulated)'
        });

    } catch (error: any) {
        console.error('Invite Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
