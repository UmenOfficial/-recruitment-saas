
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') }); // Adjust path if needed

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';

async function main() {
    console.log(`Updating Global Scale Norms for Test ID: ${GLOBAL_TEST_ID}`);

    const MEAN = 18.5;
    const STD_DEV = 2.5;

    // Update ALL scale norms under Global ID
    const { data, error, count } = await supabase
        .from('test_norms')
        .update({
            mean_value: MEAN,
            std_dev_value: STD_DEV
        })
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%')
        .select('id', { count: 'exact' });

    if (error) {
        console.error('Error updating global norms:', error);
    } else {
        console.log(`Successfully updated ${count} global scale norms to Mean=${MEAN}, StdDev=${STD_DEV}.`);
    }
}

main();
