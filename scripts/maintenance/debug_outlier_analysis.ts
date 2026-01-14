
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeOutliers() {
    const email = 'test_user@umen.cloud';
    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) return console.log('User not found');

    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1);

    if (!results || results.length === 0) return console.log('No results');
    const r = results[0];

    // Target Scales
    const targets = ['회복성', '경계선 성격장애'];

    // Fetch Norms
    const { data: norms } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', r.test_id)
        .in('category_name', targets.map(t => `Scale_${t}`));

    console.log("--- Outlier Analysis ---");

    targets.forEach(target => {
        const norm = norms?.find(n => n.category_name === `Scale_${target}`);
        const resultScale = r.detailed_scores?.scales[target];

        if (!norm || !resultScale) {
            console.log(`[${target}] Missing Data. Norm: ${!!norm}, Result: ${!!resultScale}`);
            return;
        }

        const raw = resultScale.raw;
        const mean = norm.mean_value;
        const std = norm.std_dev_value;

        // Unclamped Calc
        const zScore = (raw - mean) / std;
        const tScoreUnclamped = 50 + 10 * zScore;

        console.log(`\nScale: ${target}`);
        console.log(`- Raw Score: ${raw}`);
        console.log(`- Mean: ${mean}`);
        console.log(`- StdDev: ${std}`);
        console.log(`- Z-Score (Deviation): ${zScore.toFixed(2)}`);
        console.log(`- Calculated T-Score (Unclamped): ${tScoreUnclamped.toFixed(2)}`);
        console.log(`- Stored T-Score (Clamped): ${resultScale.t_score}`);

        if (std < 2) {
            console.warn(`  WARNING: StdDev is very small (< 2). Small raw differences cause huge T-score swings.`);
        }
    });
}

analyzeOutliers();
