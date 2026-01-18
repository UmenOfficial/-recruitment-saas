'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch All Questions (for Admin List & Dashboard)
 */
export async function fetchQuestionsAction() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('fetchQuestionsAction Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete Question
 */
export async function deleteQuestionAction(id: string) {
    try {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/questions');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Check Question Usage (Placeholder - currently returns just metadata if needed)
 * The original frontend logic didn't really check usage fully, it showed a placeholder.
 * We can keep this simple or expand.
 */
export async function checkQuestionUsageAction(id: string) {
    // Current logical placeholder
    return { success: true, usage: [] };
}
