
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SPECIFIC_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e'; // Standard Personality Test

async function main() {
    console.log(`Cleaning up duplicate norms for Test ID: ${SPECIFIC_TEST_ID}`);

    const { data, error, count } = await supabase
        .from('test_norms')
        .delete({ count: 'exact' })
        .eq('test_id', SPECIFIC_TEST_ID)
        .like('category_name', 'Scale_%'); // Delete only scales

    if (error) {
        console.error('Error deleting norms:', error);
    } else {
        console.log(`Successfully deleted ${count} duplicate Scale norms.`);
    }
}

main();
