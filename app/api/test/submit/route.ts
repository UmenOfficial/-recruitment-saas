import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculatePersonalityScores } from '@/lib/scoring';

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();
        const { answers, time_spent, application_id } = body;

        // 1. Fetch Application & Posting Info to get Test ID
        const { data: appData } = await (supabase
            .from('applications') as any)
            .select(`
                id, 
                posting_id,
                postings ( site_config )
            `)
            .eq('id', application_id)
            .single();

        const siteConfig = (appData as any)?.postings?.site_config || {};
        const testId = siteConfig.test_id || null;

        // 2. Fetch Questions (server-side score calc)
        const { data: questions } = await (supabase
            .from('questions') as any)
            .select('id, correct_answer, score, category, is_reverse_scored');

        if (!questions) throw new Error('Failed to load questions map');

        // 3. Determine Scoring Logic based on Test Type
        let totalScore = 0;
        let maxScore = 0;
        let detailScores: any = {};

        // Fetch Test Type
        const { data: testData } = await (supabase
            .from('tests') as any)
            .select('type, id')
            .eq('id', testId)
            .single();

        const testType = (testData as any)?.type || 'APTITUDE';

        // Initialize scoredAnswers array
        let scoredAnswers: any[] = [];

        if (testType === 'PERSONALITY') {
            // --- PERSONALITY SCORING LOGIC ---


            // A. Fetch necessary data: Global Norms, Local Norms, Competencies
            const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

            const [globalNormsResult, localNormsResult, competenciesResult] = await Promise.all([
                (supabase.from('test_norms') as any).select('*').eq('test_id', GLOBAL_TEST_ID),
                (supabase.from('test_norms') as any).select('*').eq('test_id', testId),
                (supabase.from('competencies') as any).select(`
                    id,
                    name,
                    competency_scales ( scale_name )
                `).eq('test_id', testId)
            ]);

            const globalNorms = (globalNormsResult as any).data || [];
            const localNorms = (localNormsResult as any).data || [];
            const competencies = (competenciesResult as any).data || [];

            // B. Prepare Input for Scoring (Map { qId: idx } to { qId: scoreValue })
            const answersMap: Record<string, number> = {};

            scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
                const question = questions.find((q: any) => q.id === qId);
                if (!question) return null;

                // Assumption: selectedIdx is 0-based index. 
                // Raw Value = index + 1 (1-5 scale)
                let rawValue = (typeof selectedIdx === 'number' ? selectedIdx : parseInt(selectedIdx as string)) + 1;

                // Apply Reverse Scoring
                if ((question as any).is_reverse_scored) {
                    rawValue = 6 - rawValue;
                }

                answersMap[qId] = rawValue;

                return {
                    question_id: qId,
                    selected_option: selectedIdx,
                    score: rawValue,
                    category: (question as any).category // Use category from question
                };
            }).filter(Boolean);

            // C. Calculate Scores using Shared Lib
            const questionList = questions.map((q: any) => ({
                id: q.id,
                category: q.category
            }));

            const compList = competencies.map((c: any) => ({
                name: c.name,
                competency_scales: c.competency_scales
            }));

            // Split norms strictly:
            // Scale Norms: FROM GLOBAL ONLY
            // Comp Norms: FROM LOCAL ONLY

            const scaleNorms = globalNorms
                .filter((n: any) => n.category_name.startsWith('Scale_'))
                .map((n: any) => ({
                    category_name: n.category_name.replace('Scale_', ''),
                    mean_value: n.mean_value,
                    std_dev_value: n.std_dev_value
                }));

            const competencyNorms = localNorms
                .filter((n: any) => !n.category_name.startsWith('Scale_'))
                .map((n: any) => ({
                    category_name: n.category_name.replace('Comp_', ''),
                    mean_value: n.mean_value,
                    std_dev_value: n.std_dev_value
                }));

            const calculated = calculatePersonalityScores(
                answersMap,
                questionList,
                scaleNorms,
                competencyNorms,
                compList
            );

            detailScores = calculated;
            totalScore = Math.round(calculated.total.t_score);

        } else {
            // --- APTITUDE (Legacy) SCORING LOGIC ---

            if (testId) {
                const { data: testQs } = await (supabase
                    .from('test_questions') as any)
                    .select('questions(score)')
                    .eq('test_id', testId);
                maxScore = testQs?.reduce((acc: number, curr: any) => acc + (curr.questions?.score || 0), 0) || 0;
            }

            scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
                const question = questions.find((q: any) => q.id === qId);
                if (!question) return null;

                const isCorrect = (question as any).correct_answer === selectedIdx;
                if (isCorrect) totalScore += (question as any).score;

                return {
                    question_id: qId,
                    selected_option: selectedIdx,
                    is_correct: isCorrect
                };
            }).filter(Boolean);
        }

        // 4. Insert Test Result
        const finalLog = {
            answers: scoredAnswers,
            scoring_breakdown: detailScores // Legacy field in log, keep for debug
        };

        const { error: resultError } = await (supabase
            .from('test_results') as any)
            .insert({
                application_id: application_id,
                total_score: totalScore,
                max_score: maxScore,
                answers_log: finalLog as any,
                completed_at: new Date().toISOString(),
                test_id: testId,
                detailed_scores: detailScores // Save properly to column
            });

        if (resultError) throw resultError;

        // 5. Update Application Status
        await (supabase
            .from('applications') as any)
            .update({ status: 'TEST_COMPLETED' })
            .eq('id', application_id);

        return NextResponse.json({ success: true, score: totalScore, max: maxScore, details: detailScores });

    } catch (error: any) {
        console.error('Submit Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
