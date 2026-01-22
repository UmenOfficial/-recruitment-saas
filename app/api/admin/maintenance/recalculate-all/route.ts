import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { mapNorms } from '@/lib/norm-mapper';
import { calculatePersonalityScores, ScoringQuestion } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // 1. Admin Check (using Session)
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user || user.email !== 'admin@umen.cloud') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Service Client (for Data Operations)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const resultsLog: string[] = [];
        let updatedCount = 0;

        // 3. Fetch All Personality Tests
        const { data: tests } = await supabase
            .from('tests')
            .select('id, title')
            .eq('type', 'PERSONALITY');

        if (!tests || tests.length === 0) {
            return NextResponse.json({ message: 'No personality tests found.' });
        }

        // 4. Process Each Test
        for (const test of tests) {
            resultsLog.push(`Processing Test: ${test.title} (${test.id})`);

            // A. Fetch Norms & Competencies
            const [normsResult, compsResult, questionsResult] = await Promise.all([
                supabase.from('test_norms').select('*').eq('test_id', test.id),
                supabase.from('competencies').select('id, name, competency_scales(scale_name)').eq('test_id', test.id),
                supabase.from('test_questions').select('questions(*), order_index').eq('test_id', test.id).order('order_index')
            ]);

            const rawNorms = normsResult.data || [];
            const competencyDefs = compsResult.data || [];
            const questionsData = questionsResult.data || [];

            // Map Norms (The Fix)
            const compList = competencyDefs.map((c: any) => ({
                name: c.name,
                competency_scales: c.competency_scales
            }));

            const { scaleNorms, competencyNorms } = mapNorms(rawNorms, compList);

            if (scaleNorms.length === 0 && competencyNorms.length === 0) {
                resultsLog.push(`Warning: No norms found for test ${test.title}. Skipping.`);
                continue;
            }

            // Prepare Questions List
            const questionsList: ScoringQuestion[] = questionsData.map((r: any) => ({
                id: r.questions.id,
                category: r.questions.category || '기타'
            }));

            const questionIndexMap = questionsData.map((r: any) => r.questions.id);
            const questionDataMap = new Map();
            questionsData.forEach((r: any) => {
                questionDataMap.set(r.questions.id, r.questions);
            });

            // B. Fetch Completed Results
            const { data: results, error: rError } = await supabase
                .from('test_results')
                .select('id, user_id, answers_log')
                .eq('test_id', test.id)
                .not('completed_at', 'is', null);

            if (rError) {
                resultsLog.push(`Error fetching results for ${test.title}: ${rError.message}`);
                continue;
            }

            if (!results || results.length === 0) {
                resultsLog.push(`No completed results for ${test.title}.`);
                continue;
            }

            resultsLog.push(`Found ${results.length} results to recalculate.`);

            // C. Recalculate
            for (const res of results) {
                const log = res.answers_log as any;
                if (!log) continue;

                const answersMap: Record<string, number> = {};

                if (Array.isArray(log)) {
                    log.forEach((item: any) => {
                        if (item.question_id && item.selected_option !== undefined) {
                            const qId = item.question_id;
                            const raw = Number(item.selected_option || item.score || 0);
                            const q = questionDataMap.get(qId);
                            if (q) {
                                const val = q.is_reverse_scored ? (6 - raw) : raw;
                                answersMap[qId] = val;
                            }
                        }
                    });
                } else if (typeof log === 'object') {
                    Object.entries(log).forEach(([key, value]) => {
                        let qId = key;
                        let raw = Number(value);

                        if (key.length < 10 && !isNaN(Number(key))) {
                            const idx = Number(key);
                            if (idx < questionIndexMap.length) {
                                qId = questionIndexMap[idx];
                            }
                        }

                        const q = questionDataMap.get(qId);
                        if (q) {
                            const val = q.is_reverse_scored ? (6 - raw) : raw;
                            answersMap[qId] = val;
                        }
                    });
                }

                if (Object.keys(answersMap).length === 0) continue;

                const calculated = calculatePersonalityScores(
                    answersMap,
                    questionsList,
                    scaleNorms,
                    competencyNorms,
                    compList
                );

                const finalTScore = Math.round(calculated.total.t_score);

                const { error: upError } = await supabase
                    .from('test_results')
                    .update({
                        total_score: finalTScore,
                        t_score: finalTScore,
                        detailed_scores: calculated as any
                    })
                    .eq('id', res.id);

                if (upError) {
                    resultsLog.push(`Failed to update result ${res.id}: ${upError.message}`);
                } else {
                    updatedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Recalculated ${updatedCount} results successfully.`,
            logs: resultsLog
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
