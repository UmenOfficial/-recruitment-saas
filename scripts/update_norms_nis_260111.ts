
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Update Norms for NIS_260111
 * 
 * Logic:
 * 1. Define Hardcoded Scale Norms (Manual Config).
 *    - To fix '80 point saturation', we increase Scale StdDev significantly.
 *    - Current: Mean=18.3, Std=0.9
 *    - Target: Mean=18.5, Std=2.5 (Wider distribution)
 * 2. Auto-calculate Competency Norms based on Scale Norms.
 *    - Comp Mean = Sum(Scale Means converted to T=50). Wait.
 *      - Comp Score = Sum(Scale T-Scores).
 *      - Scale T-Score Mean = 50. Var = 100.
 *      - Comp Mean (Theoretical) = 50 * N_Scales.
 *      - Comp Std (Theoretical) = sqrt( N*100 + N(N-1)*Cov ).
 *      - We assume moderate correlation (rho = 0.5) to be safe/realistic.
 * 3. Update DB (test_norms table) for 'NIS_260111'.
 */

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TEST_TITLE = 'NIS_260111';

// --- CONFIGURATION ---
// Global settings applied to all scales unless overridden
const DEFAULT_SCALE_NORM = {
    mean: 18.5,
    std: 2.5
};

// Specific Overrides (Optional)
// e.g. 'Scale_반사회적 성격장애': { mean: 6.0, std: 1.5 } 
// (For negative traits, raw scores are usually lower, but Input is 1-5. 
//  Since we assume lib sums inputs... wait. 
//  For Negative Scales, High Score = Good. 
//  If user is 'Not Antisocial', they choose 1 -> Reversed -> Score 5? 
//  No, "My Logic" in seeding was: Trait Level (1-5).
//  If Scale is "Antisocial", standard is Low is Good.
//  Usually Psychometric tests convert everything so High = High Trait.
//  So for Antisocial, High Score = Highly Antisocial.
//  So "Good" candidate has Low Score.
//  BUT T-Score usually normalizes so 50 is Mean.
//  Let's stick to simple distribution first.)
const SCALE_OVERRIDES: Record<string, { mean: number, std: number }> = {
    // We can list specific scales here if needed.
};
// ---------------------

async function updateNorms() {
    console.log(`Updating Norms for ${TEST_TITLE}...`);

    // 1. Get Test ID
    const { data: tests } = await supabase.from('tests').select('id').eq('title', TEST_TITLE).single();
    if (!tests) return console.error("Test not found");
    const testId = tests.id;

    // 2. Get Competency Structure to know which scales belong to which comp
    const { data: comps } = await supabase
        .from('competencies')
        .select('id, name, competency_scales(scale_name)')
        .eq('test_id', testId);

    if (!comps || comps.length === 0) return console.error("No competencies found");

    // 3. Prepare Norm Updates
    const normsToUpdate: any[] = [];
    const scaleNormsMap = new Map<string, { mean: number, std: number }>();

    // A. Collect all scale names first
    const allScaleNames = new Set<string>();
    comps.forEach((c: any) => {
        c.competency_scales.forEach((s: any) => allScaleNames.add(s.scale_name));
    });

    // B. Create Scale Norms
    console.log(`Configuring ${allScaleNames.size} Scales...`);
    allScaleNames.forEach(name => {
        const config = SCALE_OVERRIDES[name] || DEFAULT_SCALE_NORM;

        // Norm Row
        normsToUpdate.push({
            test_id: testId,
            category_name: name, // assuming 'Scale_' prefix is already in 'name' or needs adding?
            // In 'competency_scales', scale_name usually has 'Scale_' prefix? 
            // Let's check DB content from previous steps. 
            // Step 155 Output: "Scale_불안/우울장애". Yes it has prefix.
            mean_value: config.mean,
            std_dev_value: config.std
        });

        scaleNormsMap.set(name, config);
    });

    // C. Calculate & Create Competency Norms
    console.log(`Calculating Competency Norms...`);

    // Config for Correlation
    const CORRELATION_RHO = 0.5; // Moderate correlation between scales

    comps.forEach((c: any) => {
        const scales = c.competency_scales.map((s: any) => s.scale_name);
        if (scales.length === 0) return;

        // Logic: Comp Score = Sum(Scale T-Scores)
        // Scale T-Score ~ N(50, 10^2)
        // Sum Mean = N * 50
        const n = scales.length;
        const compMean = n * 50;

        // Sum Var = N * 100 + N(N-1) * rho * 100
        const varSum = (n * 100) + (n * (n - 1) * CORRELATION_RHO * 100);
        const compStd = Math.sqrt(varSum);

        console.log(`Comp [${c.name}]: N=${n}, Mean=${compMean}, Std=${compStd.toFixed(2)}`);

        normsToUpdate.push({
            test_id: testId,
            category_name: c.name, // Usually 'Comp_' prefix? 
            // In 'competencies' table, name is usually just '애국심/헌신'.
            // In 'test_norms' table, it usually has 'Comp_' prefix or uses same name?
            // Step 64 Output: "Comp_애국심/헌신". Yes prefix.
            // But verify if DB stores 'Comp_' in 'competencies.name'?
            // Step 144 Output: "애국심/헌신". NO prefix in competencies table.
            // So we MUST ADD PREFIX for norms table.

            category_name: `Comp_${c.name}`,
            mean_value: compMean,
            std_dev_value: compStd
        });
    });

    // Global Total Norm?
    // User might want TOTAL too.
    // Total Comp = Sum of all scales? Or Sum of Comps?
    // Usually "Total" is treated like a big Competency containing all scales.
    const totalN = allScaleNames.size;
    const totalMean = totalN * 50;
    const totalVar = (totalN * 100) + (totalN * (totalN - 1) * CORRELATION_RHO * 100);
    const totalStd = Math.sqrt(totalVar);

    normsToUpdate.push({
        test_id: testId,
        category_name: 'Comp_TOTAL', // Check prefix. Step 64: 'Comp_TOTAL'.
        mean_value: totalMean,
        std_dev_value: totalStd
    });
    console.log(`Comp [TOTAL]: N=${totalN}, Mean=${totalMean}, Std=${totalStd.toFixed(2)}`);

    // 4. Upsert Norms using Multi-Row Upsert?
    // Supabase upsert requires unique constraint. 'test_norms_test_id_category_name_key' typically exists.

    // We process in batches to be safe or just one go.
    const { error } = await supabase.from('test_norms').upsert(normsToUpdate, { onConflict: 'test_id, category_name' });

    if (error) {
        console.error("Error updating norms:", error);
    } else {
        console.log(`Successfully updated ${normsToUpdate.length} norm records for NIS_260111.`);
    }
}

updateNorms();
