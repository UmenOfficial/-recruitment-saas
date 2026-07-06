'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getAptitudeReportData(resultId: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // 1. Fetch Test Result
        const { data: result, error: rError } = await supabase
            .from('test_results')
            .select(`
                *,
                tests (*),
                applications!inner(user_id)
            `)
            .eq('id', resultId)
            .single() as { data: any, error: any };

        if (rError || !result) throw new Error('Result not found');

        // Verify ownership
        const ownerId = result.user_id || (Array.isArray(result.applications) ? result.applications[0]?.user_id : result.applications?.user_id);
        if (ownerId !== user.id) throw new Error('Unauthorized');

        // 2. Fetch Questions
        const answers = (result.answers_log as Record<string, number>) || {};
        const questionIds = Object.keys(answers);

        // Fetch question details including correct_answer and description
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('*')
            .in('id', questionIds);

        if (qError) throw qError;

        // 3. Calculate Stats (Global Correct Rate & Average Score)
        // Fetch all results for this test to calculate norms
        const { data: aggData, error: aggError } = await supabase
            .from('test_results')
            .select('total_score, answers_log')
            .eq('test_id', result.test_id)
            .not('total_score', 'is', null);

        let avgScore = 0;
        const qStats: Record<string, { total: number, correct: number }> = {};
        const totalCount = aggData?.length || 0;

        if (aggData && totalCount > 0) {
            const totalScoreSum = aggData.reduce((acc, r: any) => acc + (r.total_score || 0), 0);
            avgScore = totalScoreSum / totalCount;

            // Map correct answers for quick lookup
            const correctAnswers = (questions as any[])?.reduce((acc, q) => {
                acc[q.id] = String(q.correct_answer);
                return acc;
            }, {} as Record<string, string>) || {};

            // Aggregate question stats
            aggData.forEach((r: any) => {
                const log = r.answers_log as Record<string, any>;
                if (!log) return;

                Object.entries(log).forEach(([qId, ans]) => {
                    // Only track stats for questions that exist in current fetching context
                    if (correctAnswers[qId] !== undefined) {
                        if (!qStats[qId]) qStats[qId] = { total: 0, correct: 0 };

                        qStats[qId].total++;
                        // Compare as strings to be safe
                        if (String(ans) === correctAnswers[qId]) {
                            qStats[qId].correct++;
                        }
                    }
                });
            });
        }

        // Attach stats to questions
        const questionsWithStats = (questions as any[])?.map(q => ({
            ...q,
            stats: {
                rate: qStats[q.id] ? Math.round((qStats[q.id].correct / qStats[q.id].total) * 100) : 0,
                total: qStats[q.id]?.total || 0
            }
        }));

        return {
            success: true,
            data: {
                result,
                questions: questionsWithStats || [],
                metrics: {
                    avgScore: Math.round(avgScore * 10) / 10, // Round to 1 decimal
                    totalCount
                }
            }
        };

    } catch (error: any) {
        console.error('getAptitudeReportData Error:', error);
        return { success: false, error: error.message };
    }
}
