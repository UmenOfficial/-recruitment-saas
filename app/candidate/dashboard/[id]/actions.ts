'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthUser() {
    const cookieStore = await cookies();
    const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { },
                remove(name: string, options: CookieOptions) { },
            },
        }
    );
    const { data: { user } } = await authClient.auth.getUser();
    return user;
}

export async function fetchCandidateReportData(resultId: string) {
    try {
        const user = await getAuthUser();
        if (!user) return { success: false, error: 'Unauthorized', redirect: '/login' };

        // 1. Fetch Result & Verify Ownership
        const { data: result, error: resError } = await supabase
            .from("test_results")
            .select(`
                id,
                total_score,
                completed_at,
                detailed_scores,
                answers_log,
                questions_order,
                test_id,
                user_id,
                tests ( id, title, type, description )
            `)
            .eq("id", resultId)
            .single();

        if (resError || !result) {
            console.error("Fetch Result Error:", resError);
            return { success: false, error: 'Result not found' };
        }

        if (result.user_id !== user.id) {
            return { success: false, error: 'Unauthorized Access to this result' };
        }

        // 2. Fetch Competency Metadata
        const { data: compMeta } = await supabase
            .from("competencies")
            .select(`
                id,
                name,
                description,
                competency_scales ( scale_name )
            `)
            .eq("test_id", result.test_id);

        // 3. Fetch Questions & Norms
        const [qRelationsResult, normsResult] = await Promise.all([
            supabase.from('test_questions').select('is_practice, questions(*)').eq('test_id', result.test_id),
            supabase.from('test_norms').select('*').eq('test_id', result.test_id)
        ]);

        const qRelations = qRelationsResult.data;
        const norms = normsResult.data || [];

        // Process Questions
        const questionsMap: Record<string, any> = {};
        const practiceIds = new Set<string>();
        qRelations?.forEach((r: any) => {
            const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
            if (q) {
                questionsMap[q.id] = q;
                if (r.is_practice) practiceIds.add(q.id);
            }
        });

        // Process Norms
        const normsMap = norms.reduce((acc: any, n: any) => {
            acc[n.category_name] = n;
            return acc;
        }, {});

        // 4. Fetch Trends
        const { data: allResults } = await supabase
            .from("test_results")
            .select(`
                id,
                total_score,
                completed_at,
                detailed_scores,
                attempt_number
            `)
            .eq("test_id", result.test_id)
            .eq("user_id", user.id)
            .order("attempt_number", { ascending: true });

        const attempts = allResults || [];
        const trendData = attempts.map((r: any, idx: number) => {
            const detailedTotal = (r.detailed_scores as any)?.total;
            let score = typeof detailedTotal === 'number' ? detailedTotal : detailedTotal?.t_score;

            if (score === undefined || score === null) {
                score = r.total_score || 0;
            }

            return {
                id: r.id,
                index: idx + 1,
                score: Number(score.toFixed(1)),
                date: new Date(r.completed_at!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                isCurrent: r.id === resultId
            };
        });

        return {
            success: true,
            data: {
                result,
                compMeta: compMeta || [],
                questionsMap,
                practiceIds: Array.from(practiceIds), // sending IDs to filter on client/server
                normsMap,
                trendData
            }
        };

    } catch (error: any) {
        console.error("fetchCandidateReportData Error:", error);
        return { success: false, error: error.message };
    }
}
