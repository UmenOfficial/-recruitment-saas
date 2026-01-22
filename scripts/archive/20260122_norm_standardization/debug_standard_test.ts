
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debugStandard() {
    console.log('--- Debugging Standard Personality Test ---\n');

    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%Standard Personality%').limit(1);
    const test = tests?.[0];
    if (!test) return console.log('Standard Test not found');
    console.log(`Test: ${test.title} (${test.id})`);

    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', test.id)
        .order('completed_at', { ascending: false })
        .limit(1);

    const res = results?.[0];
    if (!res) return console.log('\nNo results found');

    console.log(`\nRecent Result (${res.id}):`);
    const ds = res.detailed_scores as any;
    console.log(JSON.stringify(ds, null, 2));
}

debugStandard();
