const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCompetencyScales() {
    const testId = '6fb57cd5-e320-4201-a93a-384a711aff41'; // 2026년 SKCT
    console.log(`Checking competencies for test ID: ${testId}...`);

    // 1. Get competencies for this test
    const { data: competencies, error } = await supabase
        .from('competencies')
        .select(`
            id,
            name,
            competency_scales (
                scale_name
            )
        `)
        .eq('test_id', testId);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${competencies.length} competencies:`);
    competencies.forEach(comp => {
        const scales = comp.competency_scales.map(s => s.scale_name);
        console.log(`- Competency: "${comp.name}"`);
        console.log(`  Scales (${scales.length}): ${scales.join(', ')}`);
        // Expected mean if average scale T-score is 50
        console.log(`  Expected Mean (at T=50): ${scales.length * 50}`);
    });
}

checkCompetencyScales();
