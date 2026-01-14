
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectLatestResult() {
    const email = 'test_user@umen.cloud';

    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) return console.log('User not found');

    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false }) // Completed only? Or created? User said "Report", so likely completed.
        .limit(1);

    if (!results || results.length === 0) return console.log('No results');

    const r = results[0];
    console.log(`LATEST Result ID: ${r.id}`);
    console.log(`Completed At: ${r.completed_at}`);
    console.log(`Total Score: ${r.total_score}`);
    console.log(`T-Score: ${r.t_score}`);
    console.log(`Detailed Scores:`, JSON.stringify(r.detailed_scores, null, 2));

    // Check Norms for this specific test
    const { data: norms } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', r.test_id);

    const resultKeys = Object.keys(r.detailed_scores?.scales || {});
    const normKeys = norms?.map(n => n.category_name) || [];

    // Normalize Norm Keys (Strip Scale_ prefix)
    const normKeysStripped = normKeys.map(k => k.replace('Scale_', '').replace('Comp_', ''));

    const missingInNorms = resultKeys.filter(k => !normKeysStripped.includes(k));
    const missingInResult = normKeysStripped.filter(k => !resultKeys.includes(k) && !k.includes('TOTAL') && !k.includes('애국심') && !k.includes('정보감각'));

    console.log("Keys in Result but MISSING in Norms:", missingInNorms);
    console.log("Keys in Norms but MISSING in Result:", missingInResult);

    // Inspect specifically matching one: 회복성
    const recoveryNorm = norms?.find(n => n.category_name === 'Scale_회복성');
    if (recoveryNorm) {
        console.log("Recovery Norm (Scale_회복성):", recoveryNorm);
        // Calculate T-Score manually: 50 + 10 * (raw - mean) / std_dev
        const raw = r.detailed_scores?.scales['회복성']?.raw;
        console.log("Recovery Raw:", raw);
    }
}

inspectLatestResult();
