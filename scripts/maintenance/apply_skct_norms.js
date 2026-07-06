const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Updated Norms payload based on social desirability and student response patterns
const norms = [
    { category_name: 'Comp_과감한 실행력', mean_value: 250.0000, std_dev_value: 34.6410 },        // rho = 0.35 (보통)
    { category_name: 'Comp_역량 강화와 자기 개발', mean_value: 250.0000, std_dev_value: 34.6410 }, // rho = 0.35 (보통)
    { category_name: 'Comp_팀웍의 시너지', mean_value: 250.0000, std_dev_value: 38.7298 },        // rho = 0.50 (사회적 바람직성 높음, 강한 상관)
    { category_name: 'Comp_생각 근육', mean_value: 200.0000, std_dev_value: 26.4575 },             // rho = 0.25 (개인차 큼, 약한 상관)
    { category_name: 'Comp_적응 근육', mean_value: 200.0000, std_dev_value: 26.4575 },             // rho = 0.25 (개인차 큼, 약한 상관)
    { category_name: 'Comp_공감 근육', mean_value: 200.0000, std_dev_value: 30.6594 },             // rho = 0.45 (사회적 바람직성 높음, 강한 상관)
    { category_name: 'TOTAL', mean_value: 300.0000, std_dev_value: 40.6202 }                     // rho = 0.35 (종합 상관계수)
];

async function applySkctNorms() {
    const testTitle = '2026년 SKCT';
    console.log(`Finding test: "${testTitle}"...`);
    
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id')
        .eq('title', testTitle)
        .limit(1);

    if (testError || !tests || tests.length === 0) {
        console.error('Test not found:', testError ? testError.message : 'No match');
        return;
    }

    const testId = tests[0].id;
    console.log(`Found Test ID: ${testId}`);

    for (const norm of norms) {
        console.log(`Upserting norm for ${norm.category_name}: Mean=${norm.mean_value}, SD=${norm.std_dev_value}`);
        const { error: upsertError } = await supabase
            .from('test_norms')
            .upsert({
                test_id: testId,
                category_name: norm.category_name,
                mean_value: norm.mean_value,
                std_dev_value: norm.std_dev_value
            }, {
                onConflict: 'test_id,category_name'
            });

        if (upsertError) {
            console.error(`Failed to upsert norm for ${norm.category_name}:`, upsertError.message);
        } else {
            console.log(`✅ Success for ${norm.category_name}`);
        }
    }
    
    console.log('\nAll updated norms have been applied successfully!');
}

applySkctNorms();
