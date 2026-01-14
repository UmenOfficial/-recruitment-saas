
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with Service Role Key for Admin Access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const testId = searchParams.get('test_id');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (!testId || !startDate || !endDate) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Create a new Supabase client instance for this request context if needed, 
    // but typically a static one matches the connection pooling pattern.
    // Ensure we use Service Role to bypass RLS.
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });

    const encoder = new TextEncoder();
    const BOM = '\uFEFF';

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1. Enqueue BOM for Excel
                controller.enqueue(encoder.encode(BOM));

                let offset = 0;
                const limit = 1000;
                let hasMore = true;
                let headerWritten = false;

                // Track keys to ensure consistent CSV structure
                // Ideally, we scan a sample or predefined schema. 
                // For dynamic keys (scales/comps), we might miss keys if the first batch doesn't have them.
                // However, usually all results have the same structure. 
                // To be safe, we can fetch distinct keys first? 
                // For large data, distinct key scan might be slow. 
                // Assumption: All rows for a single test have consistent structure (same scales/competencies).

                // Let's grab ONE row first to determine headers
                const { data: sampleData } = await supabase
                    .from('test_results')
                    .select('detailed_scores')
                    .eq('test_id', testId)
                    .limit(1)
                    .single();

                let scaleKeys: string[] = [];
                let compKeys: string[] = [];

                if (sampleData && sampleData.detailed_scores) {
                    const d = sampleData.detailed_scores as any;
                    scaleKeys = Object.keys(d.scales || {}).sort();
                    compKeys = Object.keys(d.competencies || {}).sort();
                }

                // Write Header
                const header = ['User_ID', 'Completed_At', ...scaleKeys, ...compKeys, 'TOTAL_RAW'];
                controller.enqueue(encoder.encode(header.join(',') + '\n'));
                headerWritten = true;

                while (hasMore) {
                    const { data, error } = await supabase
                        .from('test_results')
                        .select('id, completed_at, detailed_scores')
                        .eq('test_id', testId)
                        .eq('attempt_number', 1) // Only export FIRST attempt
                        .gte('completed_at', startDate + 'T00:00:00Z')
                        .lte('completed_at', endDate + 'T23:59:59Z')
                        .range(offset, offset + limit - 1)
                        .order('completed_at', { ascending: true }); // Order ensures consistent pagination

                    if (error) {
                        controller.error(error);
                        break;
                    }

                    if (!data || data.length === 0) {
                        hasMore = false;
                        break;
                    }

                    let chunk = '';
                    for (const row of data) {
                        const details = (row.detailed_scores as any) || {};
                        const scales = details.scales || {};
                        const comps = details.competencies || {};
                        const total = details.total;

                        const scaleVals = scaleKeys.map(k => {
                            const val = scales[k];
                            // Handle both number and object { raw, t_score }
                            // We prefer RAW for norms verification
                            // If val is number, it's raw. If object, take .raw
                            // Wait, previously we handled this.
                            const v = (typeof val === 'number' ? val : val?.raw) ?? '';
                            return v;
                        });

                        const compVals = compKeys.map(k => {
                            const val = comps[k];
                            const v = (typeof val === 'number' ? val : val?.raw) ?? '';
                            return v;
                        });

                        const totalRaw = (typeof total === 'number' ? total : total?.raw) ?? '';

                        const line = [
                            row.id,
                            row.completed_at,
                            ...scaleVals,
                            ...compVals,
                            totalRaw
                        ].join(',');

                        chunk += line + '\n';
                    }

                    controller.enqueue(encoder.encode(chunk));

                    // Check if we reached end
                    if (data.length < limit) {
                        hasMore = false;
                    } else {
                        offset += limit;
                    }
                }

                controller.close();
            } catch (err) {
                controller.error(err);
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="norms_verification_${startDate}_${endDate}.csv"`,
            'Cache-Control': 'no-cache',
        },
    });
}
