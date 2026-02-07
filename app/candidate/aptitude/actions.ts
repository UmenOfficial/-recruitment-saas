'use server';

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveAptitudeAnswer(testResultId: string, questionId: string, answer: number) {
    const supabaseUser = await createServerSupabaseClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Use Service Role to bypass RLS
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Get current answers log and verify ownership
    const { data: currentResult } = await supabaseAdmin
        .from('test_results')
        .select('answers_log, user_id')
        .eq('id', testResultId)
        .single();

    if (!currentResult) {
        throw new Error("Test result not found");
    }

    // Verify ownership
    if (currentResult.user_id !== user.id) {
        // Fallback: check via application (in case user_id is not populated on test_results)
        const { data: appResult } = await supabaseAdmin
            .from('test_results')
            .select('applications!inner(user_id)')
            .eq('id', testResultId)
            .single();

        if (!appResult) {
            throw new Error("Unauthorized access to test result");
        }

        const apps = appResult.applications as any;
        const appUserId = Array.isArray(apps) ? apps[0]?.user_id : apps?.user_id;

        if (appUserId !== user.id) {
            throw new Error("Unauthorized access to test result");
        }
    }

    const currentAnswers = (currentResult.answers_log as Record<string, number>) || {};

    // 2. Update answers log
    const updatedAnswers = {
        ...currentAnswers,
        [questionId]: answer
    };

    // 3. Save to DB
    const { error } = await supabaseAdmin
        .from('test_results')
        .update({
            answers_log: updatedAnswers,
            updated_at: new Date().toISOString()
        })
        .eq('id', testResultId);

    if (error) {
        console.error("Failed to save answer:", error);
        throw new Error("Failed to save answer");
    }

    return { success: true };
}

export async function submitAptitudeTest(testResultId: string) {
    const supabaseUser = await createServerSupabaseClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify ownership first AND get answers log
    const { data: target } = await supabaseAdmin
        .from('test_results')
        .select('user_id, applications!inner(user_id), answers_log')
        .eq('id', testResultId)
        .single();

    if (!target) {
        console.error("Submit failed: Test result not found", testResultId);
        throw new Error("Test result not found");
    }

    const apps = target.applications as any;
    const ownerId = target.user_id || (Array.isArray(apps) ? apps[0]?.user_id : apps?.user_id);

    if (ownerId !== user.id) {
        console.error(`Submit failed: Unauthorized. owner=${ownerId}, user=${user.id}`);
        throw new Error("Unauthorized");
    }

    // --- Scoring Logic ---
    const answers = (target.answers_log as Record<string, number>) || {};
    const questionIds = Object.keys(answers);
    let totalScore = 0;

    if (questionIds.length > 0) {
        // Fetch correct answers
        const { data: questions, error: qError } = await supabaseAdmin
            .from('questions')
            .select('id, correct_answer')
            .in('id', questionIds);

        if (qError) {
            console.error("Failed to fetch questions for scoring:", qError);
            // We could throw, or log and continue with 0 score, but strict is better for now
            throw new Error("Failed to calculate score");
        }

        if (questions) {
            questionIds.forEach(qId => {
                const userAnswer = answers[qId];
                const question = questions.find(q => q.id === qId);
                // Simple equality check (assuming numbers stored as numbers)
                // Using loose quality or string conversion to be safe
                if (question && String(question.correct_answer) === String(userAnswer)) {
                    totalScore += 10;
                }
            });
        }
    }

    const { error: updateError } = await supabaseAdmin
        .from('test_results')
        .update({
            completed_at: new Date().toISOString(),
            total_score: totalScore
        })
        .eq('id', testResultId);

    if (updateError) {
        console.error("Failed to submit test:", updateError);
        throw new Error("Failed to submit test");
    }

    return { success: true };
}

export async function resetTestSession(testResultId: string, testId: string, mode: 'full' | 'time_only' | 'recover') {
    console.log(`[resetTestSession] Starting reset for result=${testResultId}, test=${testId}, mode=${mode}`);
    // Use Service Role to bypass RLS for critical state reset
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    const now = new Date().toISOString();
    let error = null;

    if (mode === 'full') {
        const { error: err } = await supabase
            .from('test_results')
            .update({
                started_at: now,
                updated_at: now,
                completed_at: null, // Force clear completion status
                answers_log: {},
                violation_count: 0
            })
            .eq('id', testResultId);
        error = err;

    } else if (mode === 'time_only') {
        const { error: err } = await supabase
            .from('test_results')
            .update({
                started_at: now,
                updated_at: now,
                completed_at: null // Force clear completion status (e.g. for expired tests)
            })
            .eq('id', testResultId);
        error = err;

    } else if (mode === 'recover') {
        const { data: result } = await supabase
            .from('test_results')
            .select('started_at, updated_at')
            .eq('id', testResultId)
            .single();

        if (result && result.started_at && result.updated_at) {
            const start = new Date(result.started_at).getTime();
            const lastActive = new Date(result.updated_at).getTime();
            const timeSpentMs = lastActive - start;
            const validTimeSpent = Math.max(0, timeSpentMs);
            const newStart = new Date(new Date().getTime() - validTimeSpent).toISOString();

            const { error: err } = await supabase
                .from('test_results')
                .update({
                    started_at: newStart,
                    updated_at: now
                })
                .eq('id', testResultId);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('test_results')
                .update({
                    started_at: now,
                    updated_at: now
                })
                .eq('id', testResultId);
            error = err;
        }
    }

    if (error) {
        console.error("Reset failed:", error);
        return { success: false, error };
    }

    console.log(`[resetTestSession] Reset successful. Revalidating path for testId=${testId}`);
    revalidatePath(`/candidate/aptitude/${testId}/test`);

    return { success: true };
}
