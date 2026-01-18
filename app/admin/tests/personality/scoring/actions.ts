'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch all available Norm Tests (for list)
 */
export async function fetchNormTests() {
    try {
        const { data, error } = await supabase
            .from('tests')
            .select(`
                id, 
                title, 
                type, 
                created_at,
                test_questions(count)
            `)
            .like('type', '%PERSONALITY%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('fetchNormTests Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch details for a specific test for Scoring Page
 * (Categories, Competencies, Norms, Versions)
 */
export async function fetchScoringDetails(testId: string, globalTestId: string) {
    try {
        // 1. Categories
        const { data: qData, error: qError } = await supabase
            .from('test_questions')
            .select('questions(category)')
            .eq('test_id', testId);

        if (qError) throw qError;
        const categories = Array.from(new Set(qData.map((item: any) => item.questions?.category).filter(Boolean))) as string[];

        // 2. Competencies
        const { data: cData, error: cError } = await supabase
            .from('competencies')
            .select('name')
            .eq('test_id', testId);

        if (cError) throw cError;
        const competencies = cData.map((c: any) => c.name);

        // 3. Norms (Local + Global)
        const [localResult, globalResult] = await Promise.all([
            supabase.from('test_norms').select('*').eq('test_id', testId),
            supabase.from('test_norms').select('*').eq('test_id', globalTestId)
        ]);

        if (localResult.error) throw localResult.error;

        // 4. Versions
        const { data: vData, error: vError } = await supabase
            .from('test_norm_versions')
            .select('*')
            .eq('test_id', testId)
            .order('created_at', { ascending: false });

        return {
            success: true,
            data: {
                categories,
                competencies,
                norms: [...(localResult.data || []), ...(globalResult.data || [])],
                versions: vData || []
            }
        };

    } catch (error: any) {
        console.error('fetchScoringDetails Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upsert Norms (Approve Stage)
 */
export async function saveNorms(norms: any[]) {
    try {
        const { error } = await supabase
            .from('test_norms')
            .upsert(norms, { onConflict: 'test_id, category_name' });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Save New Norm Version
 */
export async function saveNormVersion(testId: string, versionName: string, normsSnapshot: any[]) {
    try {
        // 1. Insert
        const { data: inserted, error } = await supabase.from('test_norm_versions').insert({
            test_id: testId,
            version_name: versionName,
            active_norms_snapshot: normsSnapshot,
            is_active: true
        }).select().single();

        if (error) throw error;

        // 2. Flip others
        if (inserted) {
            await supabase.from('test_norm_versions')
                .update({ is_active: false })
                .eq('test_id', testId)
                .neq('id', inserted.id);
        }

        revalidatePath('/admin/tests/personality/scoring');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Activate Norm Version
 */
export async function activateNormVersion(testId: string, versionId: string, normsToRestore: any[]) {
    try {
        // 1. Update DB is_active flags
        await supabase.from('test_norm_versions').update({ is_active: false }).eq('test_id', testId);
        await supabase.from('test_norm_versions').update({ is_active: true }).eq('id', versionId);

        // 2. Restore Snapshot to test_norms
        const { error } = await supabase.from('test_norms').upsert(
            normsToRestore,
            { onConflict: 'test_id, category_name' }
        );

        if (error) throw error;

        revalidatePath('/admin/tests/personality/scoring');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetch Test Results for Norm Calculation (Original Action Enhancement)
 */
export async function fetchTestResultsForNorms(testId: string, sourceTestId: string, startDate: string, endDate: string) {
    try {
        // Build query
        let query = supabase
            .from('test_results')
            .select(`
                id, total_score, detailed_scores, completed_at, 
                test_id
            `)
            .eq('test_id', sourceTestId) // Use source
            .not('detailed_scores', 'is', null) // Must have scores
            .gte('completed_at', `${startDate}T00:00:00`)
            .lte('completed_at', `${endDate}T23:59:59`);

        const { data, error } = await query;
        if (error) throw error;

        // Fetch Metadata (Competencies) for the TARGET test to know structure
        const { data: compData } = await supabase
            .from('competencies')
            .select(`id, name, competency_scales(scale_name)`)
            .eq('test_id', testId);

        return {
            data,
            count: data?.length || 0,
            meta: { competencies: compData },
            error: null
        };

    } catch (error: any) {
        return { data: null, count: 0, meta: null, error: error.message };
    }
}
