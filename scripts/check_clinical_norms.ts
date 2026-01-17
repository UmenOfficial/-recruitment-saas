
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

const CLINICAL_SCALES = [
    '불안/우울 장애', '불안/우울장애',
    '공격성',
    '조현형성격장애', '조현형 성격장애',
    '반사회적 성격장애', '반사회적성격장애',
    '경계선 성격장애', '경계선성격장애',
    '의존성 성격장애', '의존성성격장애',
    '편접성 성격장애', '편집성 성격장애'
];

async function checkClinicalNorms() {
    console.log('--- Checking Global Norms for Clinical Scales ---');

    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID);

    if (error) {
        console.error(error);
        return;
    }

    // Filter for clinical
    const clinicalNorms = norms.filter(n => {
        const raw = n.category_name.replace('Scale_', '');
        // loosely match
        return CLINICAL_SCALES.some(c => c === raw);
    });

    if (clinicalNorms.length === 0) {
        console.log('No clinical norms found with exact match in Global List.');
        // List all to see if they exist with different names
        // console.log(norms.map(n => n.category_name));
    } else {
        clinicalNorms.forEach(n => {
            console.log(`Norm: ${n.category_name}`);
            console.log(`  Mean: ${n.mean_value}`);
            console.log(`  SD:   ${n.std_dev_value}`);
        });
    }
}

checkClinicalNorms();
