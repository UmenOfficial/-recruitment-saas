
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const STANDARD_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';
const NIS_TEST_ID = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';

async function updateDistinctNorms() {
    console.log('Updating Local Norms with Distinct Correlation Logic...');

    const updates: any[] = [];

    // --- 1. Standard Personality Test ---
    // Total: Sum of 3 Competency T-scores. M=150, SD=24.49 (rho=0.5)
    updates.push(
        { test_id: STANDARD_TEST_ID, category_name: 'Comp_도전', mean_value: 250, std_dev_value: 40.00 }, // rho=0.55
        { test_id: STANDARD_TEST_ID, category_name: 'Comp_헌신', mean_value: 250, std_dev_value: 41.23 }, // rho=0.60
        { test_id: STANDARD_TEST_ID, category_name: 'Comp_혁신', mean_value: 250, std_dev_value: 37.42 }, // rho=0.45
        { test_id: STANDARD_TEST_ID, category_name: 'Comp_TOTAL', mean_value: 150, std_dev_value: 24.49 }
    );

    // --- 2. NIS Customizing Test ---
    updates.push(
        { test_id: NIS_TEST_ID, category_name: 'Comp_애국심/헌신', mean_value: 250, std_dev_value: 42.43 }, // rho=0.65 (High Cohesion)
        { test_id: NIS_TEST_ID, category_name: 'Comp_정보감각/보안의식', mean_value: 250, std_dev_value: 36.06 }, // rho=0.40 (Distinct traits)
        { test_id: NIS_TEST_ID, category_name: 'Comp_책임감/전문지식', mean_value: 250, std_dev_value: 38.73 }, // rho=0.50 (Moderate)
        { test_id: NIS_TEST_ID, category_name: 'Comp_TOTAL', mean_value: 150, std_dev_value: 24.49 }
    );

    // Perform Upsert
    const { error } = await supabase
        .from('test_norms')
        .upsert(updates, { onConflict: 'test_id, category_name' });

    if (error) {
        console.error('Error updating distinct norms:', error);
    } else {
        console.log(`Successfully updated ${updates.length} distinct norms.`);
        updates.forEach(u => {
            const testName = u.test_id === STANDARD_TEST_ID ? 'Standard' : 'NIS';
            console.log(`[${testName}] ${u.category_name}: M=${u.mean_value}, SD=${u.std_dev_value}`);
        });
    }
}

updateDistinctNorms();
