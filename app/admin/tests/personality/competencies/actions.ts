'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch Personality Tests List
 */
export async function fetchPersonalityTests() {
    try {
        const { data, error } = await supabase
            .from('tests')
            .select('id, title, type, status')
            .neq('id', '8afa34fb-6300-4c5e-bc48-bbdb74c717d8')
            .like('type', '%PERSONALITY%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('fetchPersonalityTests Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch Test Details (Available Scales & Competencies)
 */
export async function fetchCompetencyDetails(testId: string) {
    try {
        // 1. Get Questions Count
        const { count } = await supabase
            .from('test_questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', testId);

        let categories: string[] = [];

        // 2. Get Attributes (Scales)
        if (count && count > 0) {
            const { data: testQs, error: qError } = await supabase
                .from('test_questions')
                .select('questions(category)')
                .eq('test_id', testId);

            if (qError) throw qError;
            categories = Array.from(new Set(testQs?.map((t: any) => t.questions?.category).filter(Boolean) || []));
        } else {
            const { data: allQs, error: aError } = await supabase
                .from('questions')
                .select('category')
                .eq('type', 'PERSONALITY');

            if (aError) throw aError;
            categories = Array.from(new Set(allQs?.map((q: any) => q.category).filter(Boolean) || []));
        }

        // 3. Get Competencies
        const { data: comps, error: cError } = await supabase
            .from('competencies')
            .select(`
                id, 
                name, 
                description, 
                competency_scales(scale_name)
            `)
            .eq('test_id', testId)
            .order('created_at', { ascending: true });

        if (cError) throw cError;

        const formattedComps = comps.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            scales: c.competency_scales.map((cs: any) => cs.scale_name)
        }));

        return {
            success: true,
            data: {
                availableScales: categories.sort(),
                competencies: formattedComps
            }
        };

    } catch (error: any) {
        console.error('fetchCompetencyDetails Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create or Update Competency
 */
export async function saveCompetency(
    testId: string,
    competencyId: string | 'NEW',
    name: string,
    description: string,
    scales: string[]
) {
    try {
        let targetId = competencyId;

        // 1. Insert or Update Competency
        if (competencyId === 'NEW') {
            const { data, error } = await supabase
                .from('competencies')
                .insert({
                    test_id: testId,
                    name: name.startsWith('Comp_') ? name : `Comp_${name}`,
                    description
                })
                .select()
                .single();

            if (error) throw error;
            targetId = data.id;
        } else {
            const { error } = await supabase
                .from('competencies')
                .update({
                    name: name.startsWith('Comp_') ? name : `Comp_${name}`,
                    description
                })
                .eq('id', competencyId);

            if (error) throw error;
        }

        // 2. Update Scales (Replace all)
        if (targetId && targetId !== 'NEW') {
            // Delete existing
            await supabase.from('competency_scales').delete().eq('competency_id', targetId);

            // Insert new
            if (scales.length > 0) {
                const mapped = scales.map(s => ({
                    competency_id: targetId,
                    scale_name: s
                }));
                await supabase.from('competency_scales').insert(mapped);
            }
        }

        revalidatePath('/admin/tests/personality/competencies');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete Competency
 */
export async function deleteCompetency(competencyId: string) {
    try {
        const { error } = await supabase
            .from('competencies')
            .delete()
            .eq('id', competencyId);

        if (error) throw error;

        revalidatePath('/admin/tests/personality/competencies');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
