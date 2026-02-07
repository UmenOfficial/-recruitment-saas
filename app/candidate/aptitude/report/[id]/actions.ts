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

        // 3. Calculate Stats (Global Correct Rate) - Mock for now or Query?
        // Querying global stats for each question might be heavy. 
        // Let's do a simple count query for each question if possible, or skip for MVP v1 and add later.
        // For now, attaching questions. We will implement global stats via a separate aggregate query if needed.

        // Let's try to get global stats: Count total answers vs correct answers for these questions
        // This is expensive on large datasets. We'll add a placeholder or simple calculation if efficient.
        // For MVP, we will return 0% or random? No, let's try to fetch real stats if possible.
        // Actually, let's keep it simple: Just return the data for the report first.

        return {
            success: true,
            data: {
                result,
                questions: questions || []
            }
        };

    } catch (error: any) {
        console.error('getAptitudeReportData Error:', error);
        return { success: false, error: error.message };
    }
}
