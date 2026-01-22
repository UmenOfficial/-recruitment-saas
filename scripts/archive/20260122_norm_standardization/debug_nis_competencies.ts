
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectNISCompetencies() {
    console.log('--- NIS Customizing Test Competency Inspection ---\n');

    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%').limit(1);
    if (!tests || tests.length === 0) return console.log('NIS Test not found');

    const testId = tests[0].id;
    console.log(`Test: ${tests[0].title} (${testId})\n`);

    const { data: competencies } = await supabase
        .from('competencies')
        .select(`
            id, 
            name, 
            competency_scales (
                scale_name
            )
        `)
        .eq('test_id', testId);

    console.log(`Found ${competencies?.length} competencies:`);
    competencies?.forEach((c: any) => {
        console.log(`\nCompetency: ${c.name}`);
        c.competency_scales.forEach((s: any) => {
            console.log(`  - Scale Ref: ${s.scale_name}`);
        });
    });
}

inspectNISCompetencies();
