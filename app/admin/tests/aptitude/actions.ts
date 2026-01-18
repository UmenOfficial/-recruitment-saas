'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function fetchAptitudeTestsAction() {
    try {
        const { data: testsData, error } = await supabase
            .from('tests')
            .select('*, test_questions(count)')
            .eq('type', 'APTITUDE')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map count
        const formatted = testsData.map((t: any) => ({
            ...t,
            question_count: t.test_questions?.[0]?.count || 0
        }));

        return { success: true, data: formatted };
    } catch (error: any) {
        console.error('fetchAptitudeTestsAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function createAptitudeTestAction(title: string, description: string, time_limit: number | null) {
    try {
        const { error } = await supabase
            .from('tests')
            .insert({
                title,
                description,
                time_limit,
                type: 'APTITUDE',
                status: 'DRAFT'
            });

        if (error) throw error;

        revalidatePath('/admin/tests/aptitude');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAptitudeTestAction(id: string, title: string, description: string, time_limit: number | null) {
    try {
        const { error } = await supabase
            .from('tests')
            .update({
                title,
                description,
                time_limit
            })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/tests/aptitude');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAptitudeTestAction(id: string) {
    try {
        const { error } = await supabase.from('tests').delete().eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/tests/aptitude');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
