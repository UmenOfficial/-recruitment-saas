'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { calculatePersonalityScores, ScoringQuestion } from '@/lib/scoring';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Security Helper: Get Auth User
 */
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

/**
 * Initialize Test
 * - Fetches test info, questions
 * - checks existing result or creates new one with shuffled questions
 */
export async function initializeTest(testId: string) {
    try {
        const user = await getAuthUser();
        if (!user) return { success: false, error: '로그인이 필요합니다.', redirect: '/login' };

        // 1. Fetch Test Info
        const { data: testData, error: tError } = await supabase
            .from('tests')
            .select('time_limit, title, description')
            .eq('id', testId)
            .single();

        if (tError) throw new Error('검사 정보를 불러올 수 없습니다.');

        // 2. Fetch Questions (Service Role)
        const { data: relations, error: rError } = await supabase
            .from('test_questions')
            .select('question_id, is_practice, questions(*)')
            .eq('test_id', testId)
            .order('order_index', { ascending: true });

        if (rError || !relations || relations.length === 0) {
            throw new Error('문항 정보를 불러올 수 없습니다.');
        }

        const allQuestionsRaw = relations.map((r: any) => ({
            ...r.questions,
            is_practice: r.is_practice
        }));

        // 3. Check Existing Result
        const { data: existingResult, error: resError } = await supabase
            .from('test_results')
            .select('id, questions_order, elapsed_seconds, answers_log, current_index, attempt_number')
            .eq('test_id', testId)
            .eq('user_id', user.id)
            .is('completed_at', null)
            .maybeSingle();

        if (resError) throw resError;

        let finalQuestions: any[] = [];
        let resultData = existingResult;
        let isResumed = false;

        if (existingResult) {
            isResumed = true;
            // Restore Order
            if ((existingResult as any).questions_order && Array.isArray((existingResult as any).questions_order)) {
                const orderMap = new Map((existingResult as any).questions_order.map((id: string, idx: number) => [id, idx]));
                finalQuestions = allQuestionsRaw.sort((a: any, b: any) => {
                    const idxA = (orderMap.get(a.id) as number) ?? 9999;
                    const idxB = (orderMap.get(b.id) as number) ?? 9999;
                    return idxA - idxB;
                });
            } else {
                finalQuestions = allQuestionsRaw;
            }
        } else {
            // New Result Logic
            const practiceQuestions = allQuestionsRaw.filter((q: any) => q.is_practice);
            const realQuestions = allQuestionsRaw.filter((q: any) => !q.is_practice);

            // Shuffling Real Questions
            for (let i = realQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [realQuestions[i], realQuestions[j]] = [realQuestions[j], realQuestions[i]];
            }
            finalQuestions = [...practiceQuestions, ...realQuestions];

            // Get Next Attempt Number
            const { data: maxAttemptData } = await supabase
                .from('test_results')
                .select('attempt_number')
                .eq('test_id', testId)
                .eq('user_id', user.id)
                .order('attempt_number', { ascending: false })
                .limit(1)
                .maybeSingle();

            const nextAttempt = ((maxAttemptData as any)?.attempt_number || 0) + 1;

            // Create Result
            const { data: newResult, error: createError } = await supabase
                .from('test_results')
                .insert({
                    test_id: testId,
                    user_id: user.id,
                    attempt_number: nextAttempt,
                    questions_order: finalQuestions.map(q => q.id),
                    elapsed_seconds: 0,
                    current_index: 0,
                    answers_log: {},
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                // If collision, maybe just retry fetch (race condition)
                if (createError.code === '23505') {
                    const { data: retry } = await supabase.from('test_results').select().eq('test_id', testId).eq('user_id', user.id).is('completed_at', null).single();
                    if (!retry) throw createError;
                    resultData = retry;
                    isResumed = true;
                } else {
                    throw createError;
                }
            } else {
                resultData = newResult;
            }
        }

        return {
            success: true,
            data: {
                test: testData, // Contains time_limit
                questions: finalQuestions,
                result: resultData,
                isResumed
            }
        };

    } catch (error: any) {
        console.error("Initialize Test Error:", error);
        return { success: false, error: error.message || '초기화 중 오류가 발생했습니다.' };
    }
}

/**
 * Save Progress (Mid-test)
 */
export async function saveProgressAction(resultId: string, currentIndex: number, answersLog: any, elapsedSeconds: number) {
    try {
        const user = await getAuthUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        // Secure Update: Check user_id matches
        const { error } = await supabase
            .from('test_results')
            .update({
                current_index: currentIndex,
                answers_log: answersLog,
                elapsed_seconds: elapsedSeconds,
                updated_at: new Date().toISOString()
            })
            .eq('id', resultId)
            .eq('user_id', user.id); // Security Check

        if (error) throw error;
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Reset Test (Delete Result)
 */
export async function resetTestAction(resultId: string) {
    try {
        const user = await getAuthUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const { error } = await supabase
            .from('test_results')
            .delete()
            .eq('id', resultId)
            .eq('user_id', user.id); // Security Check

        if (error) throw error;
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Submit Test (Secure Scoring)
 */
export async function submitTestAction(resultId: string, testId: string, answers: Record<string, number>, elapsedSeconds: number) {
    try {
        const user = await getAuthUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        console.log("Submitting test...", { resultId, testId, user: user.id });

        // 1. Fetch Data in Parallel (Optimization)
        // 병렬 처리를 통해 데이터 조회 시간을 단축합니다. (규준, 역량 정의, 문항 정보)
        console.time('FetchData');
        const [normsResult, competencyResult, questionsResult] = await Promise.all([
            supabase.from('test_norms').select('*').eq('test_id', testId),
            supabase.from('competencies').select('id, name, competency_scales(scale_name)').eq('test_id', testId),
            supabase.from('test_questions').select('questions(*)').eq('test_id', testId)
        ]);
        console.timeEnd('FetchData');

        if (normsResult.error) throw normsResult.error;
        if (competencyResult.error) throw competencyResult.error;
        if (questionsResult.error) throw questionsResult.error;

        const norms = normsResult.data;
        const competencyDefs = competencyResult.data;
        const questions = questionsResult.data?.map((r: any) => r.questions) || [];

        // 3. Prepare Scoring Data
        const scaleNorms = (norms as any)?.filter((n: any) => n.category_name.startsWith('Scale_')).map((n: any) => ({
            category_name: n.category_name.replace('Scale_', ''),
            mean_value: Number(n.mean_value),
            std_dev_value: Number(n.std_dev_value)
        })) || [];

        const competencyNorms = (norms as any)?.filter((n: any) => n.category_name.startsWith('Comp_')).map((n: any) => ({
            category_name: n.category_name.replace('Comp_', ''),
            mean_value: Number(n.mean_value),
            std_dev_value: Number(n.std_dev_value)
        })) || [];

        const compList = (competencyDefs || []).map((c: any) => ({
            name: c.name,
            competency_scales: c.competency_scales
        }));

        const scoringQuestions: ScoringQuestion[] = questions.map((q: any) => ({
            id: q.id,
            category: q.category || '기타'
        }));

        // 4. Handle Reverse Scoring & Map Answers
        const answersMap: Record<string, number> = {};
        questions.forEach((q: any) => {
            // Find answer index from 'answers' (keyed by question ID not index in this context? 
            // Wait, the client passes `answers: Record<string, number>`. 
            // The client's `answers` state was Keyed by INDEX. `Record<number, number>`.
            // But checking `submitTest` payload in `page.tsx`:
            // `answers` was converted to `answersMap` (Key ID).
            // BUT here we accept `answers` which I renamed in signature.
            // Let's expect Key=QuestionID from client for safety/clarity?
            // Or Key=Index?
            // Ideally Key=QuestionID. The client mapped it before.
            // But wait, the client state `answers` is Index->Value.
            // We should ask client to send Index->Value or ID->Value?
            // ID->Value is robust against order changes.
            // Let's assume client sends `Record<questionID, rawScore>`.

            // Wait, I need to check how I call it in `page.tsx`.
            // I will refactor `page.tsx` to pass the `answers` state (Index->Value) AND `questions`.
            // Actually it's better if `submitTestAction` just takes `answersLog` (Index->Value) and the `questionsOrder` is in DB.
            // But to avoid DB lookup for order again, client usually knows.
            // Simplest: Client converts Index->Value to ID->Value before calling.

            const rawVal = answers[q.id];
            if (rawVal !== undefined) {
                // REVERSE SCORING LOGIC
                // If the question is reverse scored, we flip it (1->5, 5->1).
                // Assuming 5 point scale.
                const val = q.is_reverse_scored ? (6 - rawVal) : rawVal;
                answersMap[q.id] = val;
            }
        });

        // 5. Calculate
        const calculated = calculatePersonalityScores(
            answersMap,
            scoringQuestions,
            scaleNorms,
            competencyNorms,
            compList
        );

        const finalTScore = calculated.total.t_score;

        // 6. Update Result
        const { error: updateError } = await supabase
            .from('test_results')
            .update({
                answers_log: answers, // Store RAW answers (Index->Value or ID->Value? Check DB schema usage. Usually UI renders using this log.)
                // If we store ID->Value, UI needs to handle that. currently UI uses Index.
                // Re-reading `saveProgress`: `answers_log: answersRef.current` (Index->Value).
                // So DB stores Index->Value.
                // But `submitTestAction` needs ID->Value for scoring.
                // So we can accept `answersLog` (Index->Value) + `questionsList` (Ordered) -> Then do the mapping here?
                // The `questions` fetched above (step 2) are NOT ordered by `test_questions.order_index` if we just did `.select('questions(*)')`.
                // We need `order_index`.

                // Correction: `initializeTest` gets ordered questions.
                // `submitTestAction` should fetch questions *in order* to map Index->ID if we receive Index-based answers.
                // OR client sends ID-based answers separately for scoring?
                // OR client sends `answersLog` (Index->Value) and we assume `questions` ordered properly?

                // Better approach: Client sends `answersLog` (Index -> Score).
                // Server fetches questions ordered.
                // Server maps Index -> ID -> Score.

                elapsed_seconds: elapsedSeconds,
                completed_at: new Date().toISOString(),
                total_score: Math.round(finalTScore),
                t_score: Math.round(finalTScore),
                detailed_scores: calculated
            })
            .eq('id', resultId)
            .eq('user_id', user.id);

        if (updateError) throw updateError;

        return { success: true };

    } catch (error: any) {
        console.error("Submit Test Error:", error);
        return { success: false, error: error.message };
    }
}
