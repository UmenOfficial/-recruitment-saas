
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const NIS_TEST_ID = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';

async function updateNISNorms() {
    console.log(`Updating NIS (${NIS_TEST_ID}) Norms with Hardcoded Estimates...`);

    const normsToUpsert = [
        // Competencies (N=5 Scales)
        // Mean = 250, Std = 38.7298
        { category_name: 'Comp_애국심/헌신', mean_value: 250, std_dev_value: 38.7298 },
        { category_name: 'Comp_정보감각/보안의식', mean_value: 250, std_dev_value: 38.7298 },
        { category_name: 'Comp_책임감/전문지식', mean_value: 250, std_dev_value: 38.7298 },

        // Total (Sum of 3 Competencies)
        // Mean = 150, Std = 24.4949
        { category_name: 'Comp_TOTAL', mean_value: 150, std_dev_value: 24.4949 }
    ];

    const { error } = await supabase
        .from('test_norms')
        .upsert(
            normsToUpsert.map(n => ({ ...n, test_id: NIS_TEST_ID })),
            { onConflict: 'test_id, category_name' }
        );

    if (error) {
        console.error('Error updating NIS norms:', error);
    } else {
        console.log('Successfully updated NIS Competency & Total Norms.');
        normsToUpsert.forEach(n => console.log(`- ${n.category_name}: M=${n.mean_value}, SD=${n.std_dev_value}`));
    }
}

updateNISNorms();
