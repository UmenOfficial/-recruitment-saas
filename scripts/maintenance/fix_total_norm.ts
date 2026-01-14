
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Key for Update
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Find Test ID
    const { data: test } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%')
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Test: ${test.title} (${test.id})`);

    // 2. Fetch All Raw Scores
    const { data: results, error } = await supabase
        .from('test_results')
        .select('id, detailed_scores')
        .eq('test_id', test.id);

    if (error || !results) { console.error("Fetch Error:", error); return; }

    const rawScores: number[] = [];
    results.forEach((r: any) => {
        const raw = r.detailed_scores?.raw_total;
        if (typeof raw === 'number') rawScores.push(raw);
    });

    let mean = 0;
    let stdDev = 0;

    if (rawScores.length < 5) {
        console.log("Not enough data to calc norms. Using HEURISTIC defaults.");
        // Heuristic for ~60 questions (Max 300). Assuming Neutral (3) avg -> 180?
        // Actually, user got 155. Let's assume Mean = 150, SD = 25.
        mean = 150;
        stdDev = 25;
    } else {
        mean = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;
        const variance = rawScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rawScores.length;
        stdDev = Math.sqrt(variance);
    }

    console.log(`Calculated Norms -> Mean: ${mean.toFixed(2)}, SD: ${stdDev.toFixed(2)}`);

    // 4. Update TOTAL Norm
    // Check if TOTAL norm exists
    const { data: existingNorm } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', test.id)
        .eq('category_name', 'TOTAL')
        .maybeSingle();

    if (existingNorm) {
        console.log("Updating existing TOTAL norm...");
        await supabase.from('test_norms')
            .update({ mean_value: mean, std_dev_value: stdDev, sample_size: rawScores.length })
            .eq('id', existingNorm.id);
    } else {
        console.log("Creating new TOTAL norm...");
        await supabase.from('test_norms')
            .insert({
                test_id: test.id,
                category_name: 'TOTAL',
                mean_value: mean,
                std_dev_value: stdDev,
                sample_size: rawScores.length
            });
    }

    // 5. Fix Latest User Result (The one in screenshot)
    // We update ALL results that have raw_total
    console.log("Updating T-scores for all results with raw_total...");

    for (const r of results) {
        if (typeof r.detailed_scores?.raw_total === 'number') {
            const raw = r.detailed_scores.raw_total;
            let tScore = 50;
            if (stdDev > 0) {
                const z = (raw - mean) / stdDev;
                tScore = Math.round((z * 10 + 50) * 100) / 100; // 2 decimal precision
            }

            // Update detailed_scores and columns
            const newDetails = { ...r.detailed_scores };
            newDetails.total = { t_score: tScore }; // Ensure object format
            // newDetails.t_score = tScore; // Optional root prop

            await supabase
                .from('test_results')
                .update({
                    total_score: Math.round(tScore), // Integer column
                    t_score: Math.round(tScore),     // Integer column
                    detailed_scores: newDetails
                })
                .eq('id', r.id);

            // Log update for one specific ID if needed
            // console.log(`Updated Result ${r.id}: Raw=${raw} -> T=${tScore}`);
        }
    }
    console.log("All updates complete.");
}

main();
