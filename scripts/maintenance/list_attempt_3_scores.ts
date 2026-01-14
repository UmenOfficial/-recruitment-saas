
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listScores() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    const userId = '343867c2-1f4f-4a82-b376-507def31a864';

    const { data: att3 } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId)
        .eq('user_id', userId)
        .eq('attempt_number', 3)
        .single();

    if (!att3) { console.log("Attempt 3 not found"); return; }

    const scales = att3.detailed_scores?.scales || {};
    const sortedKeys = Object.keys(scales).sort();

    console.log(`\n=== Attempt 3 (All 3s) T-Scores ===`);
    const formatted = sortedKeys.map(k => ({ Scale: k, T_Score: scales[k].t_score, Raw: scales[k].raw }));
    console.table(formatted);
}

listScores();
