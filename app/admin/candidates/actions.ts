'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function fetchCandidatesList() {
    try {
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (userError) throw userError;

        if (!users || users.length === 0) {
            return { success: true, data: [] };
        }

        const userIds = users.map(u => u.id);

        const { data: results, error: resError } = await supabase
            .from('test_results')
            .select(`
                id, user_id, test_id, total_score, t_score, completed_at, attempt_number,
                tests ( title, type )
            `)
            .in('user_id', userIds)
            .order('completed_at', { ascending: false });

        if (resError) throw resError;

        const formatted = users.map(user => {
            const userResults = (results || [])
                .filter((r: any) => r.user_id === user.id)
                .map((r: any) => ({
                    id: r.id,
                    test_id: r.test_id,
                    test_title: r.tests?.title,
                    test_type: r.tests?.type,
                    total_score: r.total_score,
                    t_score: r.t_score,
                    completed_at: r.completed_at,
                    attempt_number: r.attempt_number ?? 1
                }));

            return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                created_at: user.created_at,
                results: userResults
            };
        });

        return { success: true, data: formatted };

    } catch (error: any) {
        console.error('fetchCandidatesList Error:', error);
        return { success: false, error: error.message };
    }
}

export async function fetchReportDetailAction(resultId: string) {
    try {
        const { data: result, error: rErr } = await supabase
            .from("test_results")
            .select(`
                id, total_score, completed_at, detailed_scores, answers_log, questions_order, test_id, user_id,
                tests ( id, title, type, description )
            `)
            .eq("id", resultId)
            .single();

        if (rErr) throw rErr;

        const [compRes, qRes, normsRes, historyRes] = await Promise.all([
            supabase.from("competencies").select(`id, name, description, competency_scales(scale_name)`).eq("test_id", result.test_id),
            supabase.from("test_questions").select('is_practice, questions(*)').eq('test_id', result.test_id),
            supabase.from("test_norms").select('*').eq('test_id', result.test_id),
            supabase.from("test_results").select('id, total_score, completed_at, detailed_scores, attempt_number')
                .eq("test_id", result.test_id).eq("user_id", result.user_id).order("completed_at", { ascending: true })
        ]);

        return {
            success: true,
            data: {
                result,
                competencies: compRes.data || [],
                questions: qRes.data || [],
                norms: normsRes.data || [],
                history: historyRes.data || []
            }
        };
    } catch (error: any) {
        console.error('fetchReportDetailAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function resetTestResultTime(resultId: string) {
    try {
        const { error } = await supabase
            .from('test_results')
            .update({
                elapsed_seconds: 0,
                completed_at: null,
                updated_at: new Date().toISOString()
            } as any)
            .eq('id', resultId);

        if (error) throw error;

        revalidatePath('/admin/candidates');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteTestResult(resultId: string) {
    try {
        const { error } = await supabase
            .from('test_results')
            .delete()
            .eq('id', resultId);

        if (error) throw error;

        revalidatePath('/admin/candidates');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
