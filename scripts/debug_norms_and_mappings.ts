
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugNormsAndMappings() {
    const nisTestId = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';
    const stdTestId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';

    console.log("--- NIS Norms ---");
    const { data: nisNorms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', nisTestId);
    console.log(`NIS Norms Count: ${nisNorms?.length}`);
    if (nisNorms && nisNorms.length > 0) {
        console.log("Sample NIS Norms:", nisNorms.slice(0, 3));
    }

    console.log("\n--- Standard Competency-Scales Mappings ---");
    const { data: stdCompScales } = await supabase
        .from('competency_scales')
        .select('*, competencies(name)')
        .eq('test_id', stdTestId); // Note: competency_scales has test_id? Or is it via competency?
    // Actually competency_scales usually just links competency_id and scale_name.
    // Let's check via competencies table.

    const { data: stdCompetencies } = await supabase
        .from('competencies')
        .select(`
            id,
            name,
            competency_scales ( scale_name )
        `)
        .eq('test_id', stdTestId);

    console.log(JSON.stringify(stdCompetencies, null, 2));
}

debugNormsAndMappings();
