
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSeeded() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    const { data: results } = await supabase
        .from('test_results')
        .select('id, attempt_number, completed_at')
        .eq('test_id', testId)
        .gte('attempt_number', 1000)
        .limit(5);

    console.log("Seeded Data Sample (attempt >= 1000):", results);

    // Also check if any attempt=1 exist
    const { count: count1 } = await supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .eq('test_id', testId)
        .eq('attempt_number', 1);

    console.log(`Results with attempt_number = 1: ${count1}`);
}

inspectSeeded();
