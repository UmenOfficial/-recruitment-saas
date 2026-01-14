
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error('Missing env'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Find Test
    const { data: test, error } = await supabase
        .from('tests')
        .select('*')
        .eq('title', 'Sample Test: ver2')
        .single();

    if (error) { console.log('Test not found:', error.message); return; }
    console.log('Test Found:', test);

    // 2. Check Questions count
    const { count, error: qError } = await supabase
        .from('test_questions')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', test.id);
    console.log(`Question Count: ${count}`);

    // 3. Check Questions Metadata (to know categories)
    const { data: questions } = await supabase
        .from('test_questions')
        .select(`
            questions (
                id,
                category,
                is_reverse_scored
            )
        `)
        .eq('test_id', test.id);

    // Check categories
    const categories = new Set();
    questions?.forEach((q: any) => {
        if (q.questions?.category) categories.add(q.questions.category);
    });
    console.log('Categories:', Array.from(categories));

    // 4. Check test_results Schema references (by trying to insert a dummy partial)
    // We won't insert, just printing what we know.
    // We assume we need application_id. Let's see if we have a dummy posting/application to hook into
    // or if we can make up user_ids.
}

main();
