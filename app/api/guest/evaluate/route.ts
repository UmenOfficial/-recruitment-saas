import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        // Use Service Role Key to bypass RLS for guest actions
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const body = await request.json();
        const { guest_token, application_id, score_data, weighted_average, comment } = body;

        // 1. Verify Token
        const { data: tokenData, error: tokenError } = await supabase
            .from('guest_access_tokens')
            .select('id, expires_at, is_revoked')
            .eq('token', guest_token)
            .single();

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        if ((tokenData as any).is_revoked || new Date((tokenData as any).expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 401 });
        }

        // 2. Save Evaluation
        // Note: evaluator_id is left NULL for guests as they don't have a user_id.
        // We could store guest_token_id in a metadata field if needed, but for now standard schema applies.

        const { error: insertError } = await (supabase
            .from('evaluation_scores') as any)
            .insert({
                application_id,
                scores: score_data, // JSONB
                comments: comment,
                weighted_average: weighted_average,
                status: 'SUBMITTED',
                // stage: 'DOCUMENT' // We ideally should pull this from the token metadata if available
            });

        if (insertError) {
            console.error('Database Insert Error:', insertError);
            throw new Error('Failed to save evaluation');
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Submit Eval Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
