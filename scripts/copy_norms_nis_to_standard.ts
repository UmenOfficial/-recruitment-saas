
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateNorms() {
    const sourceTestId = '77ff6903-41f4-4b1f-97e2-8f42746b10e4'; // NIS
    const targetTestId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e'; // Standard

    console.log(`Migrating Norms from ${sourceTestId} to ${targetTestId}...`);

    // 1. Fetch Source Norms (Scales)
    // We assume all norms in NIS are scales
    const { data: sourceNorms, error: fetchError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', sourceTestId);

    if (fetchError || !sourceNorms) {
        console.error('Error fetching source norms:', fetchError);
        return;
    }
    console.log(`Fetched ${sourceNorms.length} Source Norms.`);

    // 2. Fetch Target Competency Mappings
    const { data: competencies } = await supabase
        .from('competencies')
        .select(`
            name,
            competency_scales ( scale_name )
        `)
        .eq('test_id', targetTestId);

    if (!competencies) {
        console.error('No competencies found for target test.');
        return;
    }

    // 3. Prepare Inserts
    const inserts: any[] = [];

    // A. Copy Scales
    // NIS norms: generic names (e.g. '자발성'). Standard needs 'Scale_자발성'.
    for (const norm of sourceNorms) {
        const name = norm.category_name; // '자발성'
        const newName = name.startsWith('Scale_') ? name : `Scale_${name}`;

        inserts.push({
            test_id: targetTestId,
            category_name: newName,
            mean_value: norm.mean_value,
            std_dev_value: norm.std_dev_value
        });
    }

    // B. Hardcode Competencies
    // Logic: Comp Raw = Sum(Scale T-Scores).
    // Expected Mean = 50 * N_scales
    // Expected SD = 10 * sqrt(N_scales) * 1.2 (Heuristic)
    for (const comp of competencies) {
        const scaleCount = comp.competency_scales.length;
        if (scaleCount === 0) continue;

        const mean = 50 * scaleCount;
        const std = Math.round(10 * Math.sqrt(scaleCount) * 1.2 * 100) / 100; // Round to 2 decimals

        // Check if norm already added (avoid dups)
        // If competency names overlap with scales? Unlikely.
        // Competencies need 'Comp_' prefix? Or just Name?
        // submit/route.ts logic: !startsWith('Scale_') -> Competency.
        // But usually we use name directly. Logic expects `category_name === comp.name`.
        // So we should NOT add prefix for Competencies, UNLESS there is a collision.
        // Since Scales have 'Scale_' prefix now, plain names are safe for Competencies.

        // Wait, if I add 'Scale_자발성', and Competency is '자발성'?
        // 'NIS' norms were '자발성'. If Standard has Scale 'Scale_자발성' and Competency '자발성' (if exists), they are distinct.
        // Standard Competencies: '헌신', '혁신', '도전'. (No overlap with typical personality scales like '자발성', '책임성' etc?)
        // Let's assume plain names.

        // Actually, submit/route.ts separates by prefix 'Scale_'.
        // Anything NOT starting with 'Scale_' is treated as Competency Norm.
        // So using 'Comp_' prefix is NOT strictly required by code logic, but might be cleaner?
        // Code: `competencyNorms.find(n => n.category_name === comp.name)`
        // So the norm name MUST match `comp.name` exactly.
        // `comp.name` is '헌신', '혁신', '도전'.
        // So we insert norms with names '헌신', '혁신', '도전'.

        inserts.push({
            test_id: targetTestId,
            category_name: comp.name,
            mean_value: mean,
            std_dev_value: std
        });
    }

    // C. Hardcode Total
    // Logic: Total Raw = Sum(Competency T-Scores).
    // N_comps = 3.
    // Mean = 50 * 3 = 150.
    // SD = 10 * sqrt(3) * 1.2 = 20.78.
    const totalMean = 150;
    const totalStd = 20.78;

    inserts.push({
        test_id: targetTestId,
        category_name: 'TOTAL', // As expected by scoring.ts
        mean_value: totalMean,
        std_dev_value: totalStd
    });

    console.log(`Prepared ${inserts.length} norms for insertion.`);

    // 4. Clean Data (Delete existing norms for target)
    await supabase.from('test_norms').delete().eq('test_id', targetTestId);
    console.log('Cleared existing norms for target test.');

    // 5. Insert New Norms
    const { error: insertError } = await supabase.from('test_norms').insert(inserts);

    if (insertError) {
        console.error('Error inserting norms:', insertError);
    } else {
        console.log('Successfully inserted all norms.');
    }
}

migrateNorms();
