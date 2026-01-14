import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // Route handler read-only for cookies mostly in this context, 
                        // but required for auth check
                    },
                    remove(name: string, options: CookieOptions) {
                    },
                },
            }
        );

        const { testResultId } = await request.json();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Test Result
        const { data: testResult, error } = await supabase
            .from('test_results')
            .select('started_at, time_limit_minutes, status')
            .eq('id', testResultId)
            .single();

        if (error || !testResult) {
            // If ID not provided, try to find active test for user? 
            // For now, assume ID is required.
            return NextResponse.json({ error: 'Test session not found' }, { status: 404 });
        }

        if (!testResult.started_at) {
            // If strict, error. If lenient, return max time.
            return NextResponse.json({ status: 'NOT_STARTED', timeLeft: testResult.time_limit_minutes * 60 });
        }

        // 2. Calculate Time
        const now = new Date();
        const startTime = new Date(testResult.started_at);
        // time_limit_minutes defaults to something if null? Schema says integer.
        const limit = testResult.time_limit_minutes || 60;
        const endTime = new Date(startTime.getTime() + limit * 60000);
        const secondsLeft = Math.floor((endTime.getTime() - now.getTime()) / 1000);

        if (secondsLeft <= 0) {
            return NextResponse.json({
                status: 'ENDED',
                timeLeft: 0
            });
        }

        return NextResponse.json({
            status: 'IN_PROGRESS',
            timeLeft: secondsLeft,
            serverTime: now.toISOString()
        });

    } catch (error) {
        console.error('Heartbeat error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
