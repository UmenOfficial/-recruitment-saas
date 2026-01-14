
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDebug() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    // 1. Fetch Norms Sample
    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', testId).limit(10);
    console.log("--- Norms Sample (First 10) ---");
    console.table(norms?.map(n => ({ cat: n.category_name, mean: n.mean_value, sd: n.std_dev_value })));

    // 2. Fetch Attempt 3 Detail
    const userId = '343867c2-1f4f-4a82-b376-507def31a864';
    const { data: att3 } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .eq('attempt_number', 3)
        .single();

    if (!att3) { console.log("Attempt 3 not found"); return; }

    console.log("\n--- Attempt 3 Details ---");
    console.log("Total T-Score:", att3.t_score);
    console.log("Detailed Scores (Partial):");
    const scales = att3.detailed_scores?.scales || {};
    const scaleKeys = Object.keys(scales).slice(0, 5);
    scaleKeys.forEach(k => {
        const s = scales[k];
        // Fetch norm for this scale
        const norm = norms?.find(n => n.category_name === `Scale_${k}` || n.category_name === k);
        console.log(`Scale ${k}: Raw=${s.raw}, T=${s.t_score} | Norm Mean=${norm?.mean_value}, SD=${norm?.std_dev_value}`);
    });
}

inspectDebug();
