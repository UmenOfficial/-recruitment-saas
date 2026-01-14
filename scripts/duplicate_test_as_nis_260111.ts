
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function duplicateTest() {
    console.log("Checking if NIS_260111 exists...");

    // 1. Check existing
    const { data: existing } = await supabase.from('tests').select('id').eq('title', 'NIS_260111').maybeSingle();
    if (existing) {
        console.log(`Test NIS_260111 already exists (ID: ${existing.id}). Skipping creation.`);
        return;
    }

    // 2. Find Source
    const { data: source } = await supabase.from('tests').select('*').ilike('title', '%NIS Customizing%').limit(1).single();
    if (!source) {
        console.error("Source 'NIS Customizing Test' not found!");
        return;
    }
    console.log(`Source Found: ${source.title} (${source.id})`);

    // 3. Create Target Test
    const { data: newTest, error: createError } = await supabase.from('tests').insert({
        ...source,
        id: undefined, // Let DB gen ID
        title: 'NIS_260111',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }).select().single();

    if (createError) {
        console.error("Failed to create test:", createError);
        return;
    }
    const newTestId = newTest.id;
    console.log(`Created 'NIS_260111' (ID: ${newTestId})`);

    // 4. Copy Questions (with mapping)
    // We need to fetch questions and test_questions. 
    // Usually questions are shared? Or specific? 
    // In this schema 'test_questions' links Test <-> Question.
    // If we want exact same questions, we just copy 'test_questions'.

    const { data: sourceTQs } = await supabase.from('test_questions').select('*').eq('test_id', source.id);
    if (sourceTQs && sourceTQs.length > 0) {
        const newTQs = sourceTQs.map(tq => ({
            ...tq,
            test_id: newTestId,
            // id: undefined // if test_questions has ID
        }));
        // Remove 'id' if present to let DB auto-inc/gen
        const cleanTQs = newTQs.map(({ id, created_at, ...rest }) => rest);

        const { error: tqError } = await supabase.from('test_questions').insert(cleanTQs);
        if (tqError) console.error("Error copying questions:", tqError);
        else console.log(`Copied ${cleanTQs.length} questions.`);
    }

    // 5. Copy Competencies (Deep copy scales?)
    // Competency linkage is complex if it links to scales.
    // Schema: competencies -> competency_scales.
    // We need to recreate competencies for the new test, and link them to scale names (strings).

    const { data: sourceComps } = await supabase
        .from('competencies')
        .select(`*, competency_scales(*)`)
        .eq('test_id', source.id);

    if (sourceComps) {
        for (const comp of sourceComps) {
            // Create New Comp
            const { competency_scales: scales, id: oldId, created_at, ...compData } = comp;
            const { data: newComp, error: cError } = await supabase.from('competencies').insert({
                ...compData,
                test_id: newTestId
            }).select().single();

            if (cError) {
                console.error("Error copying comp:", comp.name, cError);
                continue;
            }

            // Copy Scales
            if (scales && scales.length > 0) {
                const newScales = scales.map((s: any) => ({
                    competency_id: newComp.id,
                    scale_name: s.scale_name
                    // other fields?
                }));
                await supabase.from('competency_scales').insert(newScales);
            }
        }
        console.log(`Copied ${sourceComps.length} competencies.`);
    }

    // 6. Copy Norms
    // Norms are linked to Test ID. Just copy rows.
    const { data: sourceNorms } = await supabase.from('test_norms').select('*').eq('test_id', source.id);
    if (sourceNorms && sourceNorms.length > 0) {
        const newNorms = sourceNorms.map(({ id, created_at, updated_at, ...rest }) => ({
            ...rest,
            test_id: newTestId
        }));
        const { error: nError } = await supabase.from('test_norms').insert(newNorms);
        if (nError) console.error("Error copying norms:", nError);
        else console.log(`Copied ${newNorms.length} norms.`);
    }

    console.log("Duplication Complete.");
}

duplicateTest();
