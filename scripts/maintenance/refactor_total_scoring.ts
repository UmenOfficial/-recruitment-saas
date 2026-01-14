
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Starting Total Score Refactoring Migration ---");

    // 1. Find Test
    const { data: test } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%')
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Target Test: ${test.title} (${test.id})`);

    // 2. Fetch All Results
    const { data: results, error } = await supabase
        .from('test_results')
        .select('id, detailed_scores')
        .eq('test_id', test.id);

    if (error || !results) { console.error("Fetch Error:", error); return; }
    console.log(`Found ${results.length} results to process.`);

    const newRawTotals: number[] = [];

    // 3. Helper to update each result locally and collect new raw totals
    for (const r of results) {
        const details = r.detailed_scores as any;
        if (!details) continue;

        let newRawTotal = 0;
        const comps = details.competencies || {};
        const compNames = Object.keys(comps);

        if (compNames.length > 0) {
            // Sum of Competency T-Scores
            newRawTotal = compNames.reduce((sum: number, key: string) => sum + (comps[key].t_score || 0), 0);
        } else {
            // Fallback: Sum of Scale T-Scores
            const scales = details.scales || {};
            newRawTotal = Object.values(scales).reduce((sum: number, s: any) => sum + (s.t_score || 0), 0);
        }

        // Precision adjustment (e.g. 1 decimal for raw total? or keep float?)
        // Let's keep specific precision to avoid floating point drift, e.g. 2 decimals
        newRawTotal = Math.round(newRawTotal * 100) / 100;

        newRawTotals.push(newRawTotal);

        // Update local object property for later DB update
        if (!details.raw_total || details.raw_total !== newRawTotal) {
            details.raw_total = newRawTotal;
            // Mark for update? We can do meaningful updates later if needed.
            // Actually, we must update the DB 'raw_total' now so that the next step (re-calc norms) is valid conceptualy
            // BUT, norms calculation needs the dataset OF ALL raw_totals.
        }
    }

    if (newRawTotals.length < 2) {
        console.log("Not enough data to calculate norms.");
        return;
    }

    // 4. Calculate New Norms (Mean / SD of newRawTotals)
    const mean = newRawTotals.reduce((a, b) => a + b, 0) / newRawTotals.length;
    const variance = newRawTotals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / newRawTotals.length;
    const stdDev = Math.sqrt(variance);

    console.log(`New Norms -> Mean: ${mean.toFixed(2)}, SD: ${stdDev.toFixed(2)}`);

    // 5. Update TOTAL Norm in DB
    const { data: existingNorm } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', test.id)
        .eq('category_name', 'TOTAL')
        .maybeSingle();

    if (existingNorm) {
        console.log("Updating existing TOTAL norm...");
        await supabase.from('test_norms')
            .update({ mean_value: mean, std_dev_value: stdDev, sample_size: newRawTotals.length })
            .eq('id', existingNorm.id);
    } else {
        console.log("Creating new TOTAL norm...");
        await supabase.from('test_norms')
            .insert({
                test_id: test.id,
                category_name: 'TOTAL',
                mean_value: mean,
                std_dev_value: stdDev,
                sample_size: newRawTotals.length
            });
    }

    // 6. Update All Results with New Total T-Score
    console.log("Updating all results with new Total T-Scores...");

    let updateCount = 0;
    for (const r of results) {
        const details = r.detailed_scores as any;
        const rawTotal = details.raw_total; // This was updated in step 3's object but not DB yet? 
        // Wait, step 3 loop updated the Reference 'details'. 
        // We used 'details' which is a reference to r.detailed_scores object in memory.

        if (typeof rawTotal !== 'number') continue;

        let finalTScore = 50;
        if (stdDev > 0) {
            const zScore = (rawTotal - mean) / stdDev;
            finalTScore = Math.round((zScore * 10 + 50) * 100) / 100;
        }

        // Update details object
        details.total = { t_score: finalTScore };
        // Clean up legacy if exists
        // delete details.t_score; 

        await supabase
            .from('test_results')
            .update({
                total_score: Math.round(finalTScore),
                t_score: Math.round(finalTScore),
                detailed_scores: details
            })
            .eq('id', r.id);

        updateCount++;
    }

    console.log(`Migration Complete. Updated ${updateCount} records.`);
}

main();
