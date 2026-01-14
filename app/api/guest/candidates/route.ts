import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Initialize Supabase Client with Service Role Key for Admin Access (Bypass RLS)
// WARN: Use this ONLY for server-side operations that require admin privileges.
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Fallback for dev, but should be SERVICE_KEY
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // 1. Verify Token
        const { data: rawTokenData, error: tokenError } = await supabaseAdmin
            .from('guest_access_tokens')
            .select('expires_at, posting_id, is_masked')
            .eq('token', token)
            .single();

        const tokenData = rawTokenData as any; // Cast to any to avoid complex type issues

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        if (new Date(tokenData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 401 });
        }

        // 2. Fetch Candidates for the posting with Evaluation Scores
        const { data: candidates, error: fetchError } = await supabaseAdmin
            .from('applications')
            .select(`
                id, created_at, status, resume_url, portfolio_url, name,
                test_results ( total_score ),
                evaluation_scores ( id, scores, weighted_average, comments, created_at )
            `)
            .eq('posting_id', tokenData.posting_id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Fetch Error:', fetchError);
            throw fetchError;
        }

        // 3. Return Data (Apply Masking based on Token Settings)
        const maskName = (name: string | null) => {
            if (!name) return '익명';
            if (name.length <= 1) return name;
            return name.charAt(0) + '*'.repeat(name.length - 1);
        };

        const processedCandidates = (candidates as any[])?.map(app => {
            // Get the latest evaluation if multiple exist
            const latestEval = app.evaluation_scores && app.evaluation_scores.length > 0
                ? app.evaluation_scores.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                : null;

            return {
                ...app,
                name: tokenData.is_masked ? maskName(app.name) : app.name,
                is_masked: tokenData.is_masked,
                evaluation: latestEval // Return the previous evaluation data
            };
        });

        return NextResponse.json({
            success: true,
            candidates: processedCandidates
        });

    } catch (error: any) {
        console.error('Guest API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
