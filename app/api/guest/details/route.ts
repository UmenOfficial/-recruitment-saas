import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { maskData, decrypt } from '@/lib/encryption';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

        const supabase = await createServerSupabaseClient();

        // 1. Verify Token & Get Scope
        const { data: tokenData, error: tokenError } = await supabase
            .from('guest_access_tokens')
            .select('posting_id, expires_at')
            .eq('token', token)
            .single();

        if (tokenError || !tokenData) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

        if ((tokenData as any).is_revoked || new Date((tokenData as any).expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token Expired' }, { status: 401 });
        }

        // 2. Fetch Candidates for this Posting
        // We fetch basic info + encrypted PII + test results
        const { data: applications, error: appError } = await supabase
            .from('applications')
            .select(`
        id,
        status,
        pii_phone_encrypted,
        test_results ( total_score ),
        users ( full_name )
      `)
            .eq('posting_id', (tokenData as any).posting_id)
            .eq('status', 'TEST_COMPLETED') // Only show those who finished test
            .order('created_at', { ascending: false });

        if (appError) throw appError;

        // 3. Process Data: Decrypt -> Mask -> Return
        const safeCandidates = applications.map((app: any) => {
            // NOTE: User's name is in 'users.full_name' (Assuming we have it non-encrypted there for internal use, 
            // or if it was encrypted, we'd decrypt it. In our schema it is plain text in users table usually, 
            // but let's assume strict PII if requested.
            // Schema says: users.full_name is VARCHAR.

            const realName = app.users?.full_name || 'Candidate';
            const realPhone = app.pii_phone_encrypted ? decrypt(app.pii_phone_encrypted) : '000-0000-0000';

            return {
                id: app.id,
                masked_name: maskData(realName, 'name'),
                masked_phone: maskData(realPhone, 'phone'),
                status: app.status,
                test_score: app.test_results?.[0]?.total_score || 0
            };
        });

        return NextResponse.json({ candidates: safeCandidates });

    } catch (error: any) {
        console.error('Guest Details API Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
