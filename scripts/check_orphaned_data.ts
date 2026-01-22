
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkOrphanedResults() {
    // 1. Get all test_ids from test_results
    const { data: results } = await supabase.from('test_results').select('test_id');
    const resultTestIds = [...new Set(results?.map(r => r.test_id))];

    console.log(`Unique Test IDs in Results: ${resultTestIds.length}`);
    console.log(resultTestIds);

    // 2. Check if these exist in 'tests' table
    const { data: tests } = await supabase.from('tests').select('id, title').in('id', resultTestIds);

    console.log(`Found Matching Tests: ${tests?.length}`);
    tests?.forEach(t => console.log(` - ${t.title} (${t.id})`));
}

checkOrphanedResults();
