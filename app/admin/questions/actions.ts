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

/**
 * Upsert Question (Create or Update)
 * Uses Service Role to bypass RLS for Admins
 */
export async function upsertQuestionAction(payload: {
    id?: string;
    category: string;
    difficulty: string;
    content: string;
    description: string;
    image_url: string | null;
    options: any[];
    correct_answer: number | null;
    score: number;
    type: string;
    is_reverse_scored: boolean;
}) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasKey = !!serviceKey;
    const keyStart = serviceKey ? serviceKey.substring(0, 5) + '...' : 'NONE';

    try {
        if (!hasKey) {
            throw new Error('Config Error: SUPABASE_SERVICE_ROLE_KEY is missing');
        }
        if (payload.id) {
            // Update
            const { error } = await supabase
                .from('questions')
                .update({
                    category: payload.category,
                    difficulty: payload.difficulty,
                    content: payload.content,
                    description: payload.description,
                    image_url: payload.image_url,
                    options: payload.options,
                    correct_answer: payload.correct_answer,
                    score: payload.score,
                    type: payload.type,
                    is_reverse_scored: payload.is_reverse_scored,
                    updated_at: new Date().toISOString()
                })
                .eq('id', payload.id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase
                .from('questions')
                .insert({
                    category: payload.category,
                    difficulty: payload.difficulty,
                    content: payload.content,
                    description: payload.description,
                    image_url: payload.image_url,
                    options: payload.options,
                    correct_answer: payload.correct_answer,
                    score: payload.score,
                    type: payload.type,
                    is_reverse_scored: payload.is_reverse_scored
                });
            if (error) throw error;
        }

        revalidatePath('/admin/questions');
        return { success: true };

    } catch (error: any) {
        console.error('upsertQuestionAction Error:', error);
        // Include debug info in error message
        return { success: false, error: `${error.message} (Key: ${keyStart})` };
    }
}
