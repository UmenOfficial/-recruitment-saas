'use server';

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveAptitudeAnswer(testResultId: string, questionId: string, answer: number) {
    const supabase = await createServerSupabaseClient();

    // 1. Get current answers log
    const { data: currentResult } = await supabase
        .from('test_results')
        .select('answers_log')
        .eq('id', testResultId)
        .single();

    if (!currentResult) {
        throw new Error("Test result not found");
    }

    const currentAnswers = (currentResult.answers_log as Record<string, number>) || {};

    // 2. Update answers log
    const updatedAnswers = {
        ...currentAnswers,
        [questionId]: answer
    };

    // 3. Save to DB
    const { error } = await supabase
        .from('test_results')
        .update({
            answers_log: updatedAnswers,
            updated_at: new Date().toISOString()
            // optional: update violation_log if needed in future
        })
        .eq('id', testResultId);

    if (error) {
        console.error("Failed to save answer:", error);
        throw new Error("Failed to save answer");
    }

    return { success: true };
}

export async function submitAptitudeTest(testResultId: string) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
        .from('test_results')
        .update({
            completed_at: new Date().toISOString()
        })
        .eq('id', testResultId);

    if (error) {
        console.error("Failed to submit test:", error);
        throw new Error("Failed to submit test");
    }

    // Redirect to dashboard
    redirect('/candidate/dashboard');
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
                updated_at: now
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
