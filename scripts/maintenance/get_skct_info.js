const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Env variables are missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getSkctInfo() {
    console.log('Searching for tests containing "SKCT" or "2026"...');
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, type')
        .or('title.ilike.%SKCT%,title.ilike.%2026%');

    if (testError) {
        console.error('Error searching tests:', testError.message);
        return;
    }

    console.log('Found tests:', tests);

    if (!tests || tests.length === 0) {
        console.log('No tests found. Listing all personality tests instead:');
        const { data: allTests } = await supabase
            .from('tests')
            .select('id, title, type')
            .like('type', '%PERSONALITY%');
        console.log(allTests);
        return;
    }

    for (const test of tests) {
        console.log(`\n==================================================`);
        console.log(`Test: ${test.title} (ID: ${test.id})`);
        console.log(`==================================================`);

        // Fetch competencies
        const { data: comps, error: compError } = await supabase
            .from('competencies')
            .select(`
                id,
                name,
                description,
                competency_scales(scale_name)
            `)
            .eq('test_id', test.id);

        if (compError) {
            console.error('Error fetching competencies:', compError.message);
            continue;
        }

        if (!comps || comps.length === 0) {
            console.log('No competencies found for this test.');
            continue;
        }

        comps.forEach(c => {
            const scales = c.competency_scales.map(s => s.scale_name);
            console.log(`- Competency: ${c.name} (ID: ${c.id})`);
            console.log(`  Scales (${scales.length}): ${scales.join(', ')}`);
        });
    }
}

getSkctInfo();
