import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase Client with Service Role Key to bypass RLS for counting
// If SERVICE_ROLE_KEY is not available, we might fail to count if RLS blocks it.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        const { count, error } = await supabaseAdmin
            .from('waitlist')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Waitlist count error:', error);
            return NextResponse.json({ count: 72 }, { status: 500 });
        }

        return NextResponse.json({ count: count || 0 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ count: 72 }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { email, agreed_privacy } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
        }

        // Calculate KST time string
        // Format: 2024. 1. 4. 오후 5:44:00
        const now = new Date();
        const created_at_kst = now.toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });

        // Use admin client or standard client?
        // Admin client is safer to ensure it works regardless of RLS quirks, 
        // though we added public insert policy.
        const { error } = await supabaseAdmin
            .from('waitlist')
            .insert({ email, agreed_privacy, created_at_kst });

        if (error) {
            // Handle unique constraint violation gracefully
            if (error.code === '23505') { // unique_violation
                return NextResponse.json({ message: 'Already registered' }, { status: 200 });
            }
            console.error('Waitlist insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
