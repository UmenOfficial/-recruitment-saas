
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    // 1. Find Tests
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS Customizing%').limit(1);
    if (!tests || tests.length === 0) return console.log("Test not found");
    const testId = tests[0].id;

    // 2. Find Competencies
    // Check for localized names like '조직부적응', '부적응', 'Mind Score', etc.
    const { data: comps } = await supabase
        .from('competencies')
        .select('id, name, competency_scales(scale_name)')
        .eq('test_id', testId);

    if (!comps) return console.log("No comps found");

    console.log("All Competencies:");
    comps.forEach(c => console.log(`- ${c.name}`));

    // 3. Identify likely "Mind Care" candidates via Scale Norms names
    const { data: norms } = await supabase.from('test_norms')
        .select('category_name')
        .eq('test_id', testId)
        .ilike('category_name', 'Scale_%');

    if (norms) {
        const keywords = ['우울', '불안', '충동', '반사회', '정서', '부적응', 'Mind', '스트레스', '회의'];
        const suspicious = norms.filter(n => keywords.some(k => n.category_name.includes(k)));
        console.log("\nPotential Mind Care Scales (Direct Match):");
        suspicious.forEach(s => console.log(`- ${s.category_name}`));
    }
}

run();
