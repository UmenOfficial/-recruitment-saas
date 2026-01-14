
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCompetenciesAndNorms() {
    const testId = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';

    // Inspect competency_scales schema first to be safe
    const { data: cols } = await supabase.from('competency_scales').select('*').limit(1);
    if (cols && cols.length > 0) console.log('Competency Scales Columns:', Object.keys(cols[0]));

    const { data: competencies, error: compError } = await supabase
        .from('competencies')
        .select(`
            id, 
            name, 
            description,
            competency_scales (
                scale_name
            )
        `)
        .eq('test_id', testId);

    if (compError) {
        console.error('Error fetching competencies:', compError);
        return;
    }

    console.log(`\n=== Competencies & Formulas (${competencies?.length}) ===`);
    competencies?.forEach(comp => {
        console.log(`\n[${comp.name}]`);
        if (comp.competency_scales && comp.competency_scales.length > 0) {
            // Assuming simple additive formula if no factor relation found
            const formula = comp.competency_scales.map((cs: any) => cs.scale_name).join(' + ');
            console.log(`Defined Components: ${formula}`);
        } else {
            console.log('Formula: (No scales linked)');
        }
    });

    const compNames = competencies?.map(c => c.name) || [];
    const searchNames = [...compNames, ...compNames.map(n => `Comp_${n}`)];

    const { data: norms, error: normError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', testId)
        .in('category_name', searchNames);

    if (normError) {
        console.error('Error fetching norms:', normError);
    }

    console.log(`\n=== Norms (${norms?.length}) ===`);
    norms?.forEach(n => {
        console.log(`\nCategory: ${n.category_name}`);
        console.log(`Mean: ${n.mean_value}`);
        console.log(`Std Dev: ${n.std_dev_value}`);
    });
}

inspectCompetenciesAndNorms();
