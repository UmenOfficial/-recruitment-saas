
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORRELATION_RHO = 0.5;

async function processTest(testId: string, title: string) {
    console.log(`\nProcessing Test: ${title} (${testId})`);

    // 1. Fetch Competencies and their Scales
    const { data: comps } = await supabase
        .from('competencies')
        .select('id, name, competency_scales ( scale_name )')
        .eq('test_id', testId);

    if (!comps || comps.length === 0) {
        console.log('No competencies found.');
        return;
    }

    const normsToUpsert: any[] = [];
    let totalScaleCount = 0;

    // 2. Calculate Competency Norms
    comps.forEach((c: any) => {
        const scales = c.competency_scales || [];
        const n = scales.length;
        if (n === 0) return;

        totalScaleCount += n;

        // Formula:
        // Comp Score = Sum(T-Scores)
        // E[T] = 50. Var[T] = 100.
        // Mean = 50 * n
        // Var = n*100 + n*(n-1)*rho*100

        const mean = 50 * n;
        const variance = (n * 100) + (n * (n - 1) * CORRELATION_RHO * 100);
        const std = Math.sqrt(variance);

        normsToUpsert.push({
            test_id: testId,
            category_name: `Comp_${c.name}`, // Add prefix for consistency
            mean_value: mean,
            std_dev_value: Number(std.toFixed(4))
        });

        console.log(`  - Comp [${c.name}]: scales=${n}, Mean=${mean}, Std=${std.toFixed(2)}`);
    });

    // 3. Calculate Total Norm (If 'Comp_TOTAL' is needed)
    // Assuming Total Score is sum of ALL scale T-scores in the competencies?
    // Or sum of Competency T-scores?
    // lib/scoring.ts: totalRaw += cT (Sum of Competency T-scores)
    // Wait. `calculatePersonalityScores` line 88: `totalRaw += cT`.
    // `cT` is the T-score of the Competency.
    // So Total Raw Score = Sum of Competency T-scores.
    // Competency T-score ~ N(50, 10).
    // So Total Norm depends on How many Competencies there are.

    const numComps = normsToUpsert.length; // Approximate number of competencies
    // Mean = 50 * numComps
    // Var = numComps*100 + ... (Assuming correlation between competencies too?)
    // Let's assume rho=0.5 between competencies as well.

    const totalMean = 50 * numComps;
    const totalVar = (numComps * 100) + (numComps * (numComps - 1) * CORRELATION_RHO * 100);
    const totalStd = Math.sqrt(totalVar);

    normsToUpsert.push({
        test_id: testId,
        category_name: 'Comp_TOTAL',
        mean_value: totalMean,
        std_dev_value: Number(totalStd.toFixed(4))
    });

    console.log(`  - TOTAL: comps=${numComps}, Mean=${totalMean}, Std=${totalStd.toFixed(2)}`);

    // 4. Update DB
    const { error } = await supabase
        .from('test_norms')
        .upsert(normsToUpsert, { onConflict: 'test_id, category_name' });

    if (error) console.error('Error updating local norms:', error);
    else console.log(`  Successfully updated ${normsToUpsert.length} local norms.`);
}

async function main() {
    // Fetch all Personality Tests
    const { data: tests } = await supabase
        .from('tests')
        .select('id, title')
        .eq('type', 'PERSONALITY');

    if (!tests) return;

    // Filter out the Global Test Placeholder if it has type PERSONALITY
    const activeTests = tests.filter(t => t.title !== 'Global Scale Norms');

    for (const t of activeTests) {
        await processTest(t.id, t.title);
    }
}

main();
