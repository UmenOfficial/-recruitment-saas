
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectTest() {
    console.log('--- Finding Test: 삼성전자 customizing test ---\n');

    // 1. Find Test ID
    const { data: tests, error: tErr } = await supabase
        .from('tests')
        .select('id, title')
        .ilike('title', '%삼성전자%customizing%');

    if (tErr) { console.error(tErr); return; }
    if (!tests || tests.length === 0) {
        console.log('Test not found.');
        return;
    }

    const test = tests[0];
    console.log(`Found Test: "${test.title}" (ID: ${test.id})`);

    // 2. Fetch Competencies
    const { data: comps, error: cErr } = await supabase
        .from('competencies')
        .select(`
            id, name,
            competency_scales ( scale_name )
        `)
        .eq('test_id', test.id);

    if (cErr) { console.error(cErr); return; }

    console.log(`\nCompetencies (${comps?.length}):`);
    comps?.forEach(c => {
        const scales = c.competency_scales.map((s: any) => s.scale_name).join(', ');
        console.log(`- ${c.name}: [${scales}]`);
    });
}

inspectTest();
