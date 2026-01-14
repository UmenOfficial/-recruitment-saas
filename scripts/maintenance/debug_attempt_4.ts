
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAtt4() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    const userId = '343867c2-1f4f-4a82-b376-507def31a864';

    // 1. Fetch Attempt 4
    const { data: att4 } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .eq('attempt_number', 4)
        .single();

    if (!att4) { console.log("Attempt 4 not found"); return; }

    console.log(`\n=== Attempt 4 (All 4s) ===`);
    console.log(`Total T: ${att4.t_score}`);

    // Inspect specific scales
    const scales = att4.detailed_scores?.scales || {};
    const scaleNames = Object.keys(scales).slice(0, 5); // First 5

    const { data: norms } = await supabase.from('test_norms').select('*').eq('test_id', testId);

    scaleNames.forEach(k => {
        const s = scales[k];
        const norm = norms?.find(n => n.category_name === `Scale_${k}` || n.category_name === k);
        console.log(`Scale '${k}': Raw=${s.raw}, T=${s.t_score}`);
        console.log(`   Norm: Mean=${norm?.mean_value}, SD=${norm?.std_dev_value}`);

        // Manual Calc Check
        if (norm) {
            const z = (s.raw - norm.mean_value) / norm.std_dev_value;
            console.log(`   Calc Z: ${z.toFixed(2)}`);
        }
    });

    // Check Question Reverse status for these scales
    const { data: qData } = await supabase.from('questions').select('content, is_reverse_scored, category').in('category', scaleNames);
    console.log("\n--- Question Details ---");
    scaleNames.forEach(k => {
        const qs = qData?.filter(q => q.category === k);
        const revCount = qs?.filter(q => q.is_reverse_scored).length;
        console.log(`Scale '${k}': ${qs?.length} questions. Reverse=${revCount}`);
    });
}

inspectAtt4();
