
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const NIS_TEST_ID = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';

async function inspectNIS() {
    console.log(`Inspecting NIS Test (${NIS_TEST_ID})...`);

    const { data: comps } = await supabase
        .from('competencies')
        .select('name, competency_scales ( scale_name )')
        .eq('test_id', NIS_TEST_ID);

    if (!comps) return;

    let totalScales = 0;
    comps.forEach((c: any) => {
        const count = c.competency_scales.length;
        totalScales += count;
        console.log(`- ${c.name}: ${count} scales`);
        c.competency_scales.forEach((s: any) => console.log(`  * ${s.scale_name}`));
    });

    console.log(`Total Scales for Comprehensive Norm: ${totalScales}`);
}

inspectNIS();
