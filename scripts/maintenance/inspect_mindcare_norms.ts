
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectMindCareNorms() {
    // Fetch Norms for disorders
    const disorders = [
        "반사회적 성격장애", "불안/우울장애", "경계선 성격장애",
        "의존성 성격장애", "조현형 성격장애", "공격성", "편집성 성격장애"
    ];

    const { data: norms } = await supabase
        .from('test_norms')
        .select('*')
        .in('category_name', disorders); // Try raw names

    // Also try with 'Scale_' prefix if raw not found
    const { data: normsPrefix } = await supabase
        .from('test_norms')
        .select('*')
        .in('category_name', disorders.map(d => `Scale_${d}`));

    console.log("--- Mind Care Norms ---");
    [...(norms || []), ...(normsPrefix || [])].forEach(n => {
        console.log(`${n.category_name}: Mean = ${n.mean_value}, Std = ${n.std_dev_value}`);
        // Calculate T-score for raw 10 (answering 2 for 5 questions)
        // Raw=10
        const t = 50 + 10 * ((10 - n.mean_value) / n.std_dev_value);
        console.log(`  -> If Raw=10 (All 2s): T = ${t.toFixed(2)}`);
    });
}

inspectMindCareNorms();
