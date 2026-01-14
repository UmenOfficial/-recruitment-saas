
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Update Norms & Save Version 'NIS_260111' for 'NIS Customizing Test'
 * 
 * Logic:
 * 1. Target Rule: 'NIS Customizing Test' (Original)
 * 2. Update Norms (Manual Config: Mean=18.5, Std=2.5)
 * 3. Save Version: Insert into 'test_norm_versions' as 'NIS_260111'
 */

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TARGET_TEST_TITLE_KEYWORD = 'NIS Customizing';
const VERSION_NAME = 'NIS_260111';

// --- CONFIGURATION ---
// Base Stats for Scales (Simulating N=300)
const SCALE_BASE_MEAN = 18.5;
const SCALE_BASE_STD = 2.5;

// Correlation assumptions
const CORRELATION_RHO_SCALES = 0.5; // Within Competency
const CORRELATION_RHO_COMPS = 0.6;  // Between Competencies

function generateRealisticScaleStats(name: string) {
    // Deterministic randomish based on name to be consistent across runs if needed, 
    // or just pure random for "Variance". Let's use pure random but bounded.

    // Mean: 17.5 ~ 19.5
    const meanVariation = (Math.random() - 0.5) * 2.0;
    const mean = SCALE_BASE_MEAN + meanVariation;

    // Std: 2.0 ~ 3.0
    const stdVariation = (Math.random() - 0.5) * 1.0;
    const std = SCALE_BASE_STD + stdVariation;

    return {
        mean: parseFloat(mean.toFixed(2)),
        std: parseFloat(std.toFixed(2))
    };
}
// ---------------------

async function run() {
    console.log(`Refining Norms & Updating Version '${VERSION_NAME}'...`);

    // 1. Find Target Test
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', `%${TARGET_TEST_TITLE_KEYWORD}%`).limit(1);
    if (!tests || tests.length === 0) return console.error("Target Test not found");
    const testId = tests[0].id;

    // 2. Get Structure
    const { data: comps } = await supabase
        .from('competencies')
        .select('id, name, competency_scales(scale_name)')
        .eq('test_id', testId);

    if (!comps) return console.error("No comps found");

    const normsToUpdate: any[] = [];
    const scaleStatsMap = new Map<string, { mean: number, std: number }>();

    // A. Generate Scale Norms
    console.log("Generating Scale Norms (Simulating N=300)...");
    comps.forEach((c: any) => {
        c.competency_scales.forEach((s: any) => {
            const name = s.scale_name;
            const stats = generateRealisticScaleStats(name); // Unique per scale

            normsToUpdate.push({
                test_id: testId,
                category_name: name,
                mean_value: stats.mean,
                std_dev_value: stats.std
            });
            scaleStatsMap.set(name, stats);
        });
    });

    // B. Calculate Competency Norms
    // Comp Score = Sum(Scale T-Scores)
    // Mean = N * 50
    // Var = N*100 + N(N-1)*rho*100

    console.log("Calculating Competency Norms...");
    let totalCompSumMean = 0;
    let totalCompVarSum = 0;
    const compCount = comps.length;

    comps.forEach((c: any) => {
        const n = c.competency_scales.length;
        if (n === 0) return;

        const compMean = n * 50;
        const varSum = (n * 100) + (n * (n - 1) * CORRELATION_RHO_SCALES * 100);
        const compStd = Math.sqrt(varSum);

        console.log(`- Comp [${c.name}]: Scales=${n}, Mean=${compMean}, Std=${compStd.toFixed(2)}`);

        normsToUpdate.push({
            test_id: testId,
            category_name: `Comp_${c.name}`,
            mean_value: compMean,
            std_dev_value: parseFloat(compStd.toFixed(5))
        });

        totalCompSumMean += compMean; // This isn't Comp T-Score. 
        // Wait. Total Score is Sum of COMPETENCY T-SCORES.
        // Competency T-Score has Mean 50, Std 10 (By Definition of T-Score).
        // So Total Mean = Sum(50 * CompCount).
    });

    // C. Calculate Total Score Norm
    // Total Score = Sum(Comp T-Scores).
    // Comp T-Scores are N(50, 100).
    // Total Mean = CompCount * 50.
    // Total Var = CompCount * 100 + CompCount(CompCount-1) * rho_comp * 100.

    // User requested Total Mean = 150 (since 3 Comps).
    // Let's verify CompCount.
    if (compCount === 3) {
        const totalMean = 3 * 50; // 150
        const totalVar = (3 * 100) + (3 * 2 * CORRELATION_RHO_COMPS * 100);
        const totalStd = Math.sqrt(totalVar);

        console.log(`- Total (Sum of 3 Comps): Mean=${totalMean}, Std=${totalStd.toFixed(2)}`);

        normsToUpdate.push({
            test_id: testId,
            category_name: 'Comp_TOTAL',
            mean_value: totalMean,
            std_dev_value: parseFloat(totalStd.toFixed(5))
        });
    } else {
        console.warn(`Warning: Comp Count is ${compCount}, not 3. Total Mean will be ${compCount * 50}.`);
        const totalMean = compCount * 50;
        const totalVar = (compCount * 100) + (compCount * (compCount - 1) * CORRELATION_RHO_COMPS * 100);
        const totalStd = Math.sqrt(totalVar);

        normsToUpdate.push({
            test_id: testId,
            category_name: 'Comp_TOTAL',
            mean_value: totalMean,
            std_dev_value: parseFloat(totalStd.toFixed(5))
        });
    }

    // 3. Update 'test_norms' (Current Active)
    const { error: upsertError } = await supabase.from('test_norms').upsert(normsToUpdate, { onConflict: 'test_id, category_name' });
    if (upsertError) return console.error("Error updating norms:", upsertError);
    console.log(`Updated ${normsToUpdate.length} norms.`);

    // 4. Update Version Snapshot 'NIS_260111'
    const { data: existingV } = await supabase.from('test_norm_versions')
        .select('id')
        .eq('test_id', testId)
        .eq('version_name', VERSION_NAME)
        .maybeSingle();

    if (existingV) {
        await supabase.from('test_norm_versions').update({
            active_norms_snapshot: normsToUpdate,
            is_active: true,
            created_at: new Date().toISOString()
        }).eq('id', existingV.id);
        console.log(`Updated Version '${VERSION_NAME}'.`);
    } else {
        // Fallback if deleted or missing
        await supabase.from('test_norm_versions').insert({
            test_id: testId,
            version_name: VERSION_NAME,
            description: 'Refined Manual Norms (N=300 Simulation)',
            active_norms_snapshot: normsToUpdate,
            is_active: true
        });
        console.log(`Created Version '${VERSION_NAME}'.`);
    }
}

run();
