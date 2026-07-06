const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectResultDetail() {
    const resultId = '2edb87ab-8142-4239-a642-a25920ee4934';
    console.log(`Inspecting test result details for ID: ${resultId}...`);

    const { data: result, error } = await supabase
        .from('test_results')
        .select('id, user_id, test_id, total_score, detailed_scores')
        .eq('id', resultId)
        .maybeSingle();

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!result) {
        console.log('Result not found.');
        return;
    }

    console.log(`Total Score: ${result.total_score}`);
    console.log('Detailed Scores JSON:');
    console.log(JSON.stringify(result.detailed_scores, null, 2));
}

inspectResultDetail();
