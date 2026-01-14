
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function count() {
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.log('Test not found'); return; }

    const { count } = await supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId)
        .gte('attempt_number', 1000);

    console.log(`Seeded Results Count: ${count}`);
}
count();
