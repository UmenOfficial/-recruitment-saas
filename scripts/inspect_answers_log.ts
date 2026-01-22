
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectLog() {
    console.log('--- Inspecting Answers Log ---');

    // Get a result for NIS test
    const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .not('completed_at', 'is', null) // Complete only
        .order('completed_at', { ascending: false })
        .limit(3);

    if (!results) return;

    for (const res of results) {
        console.log(`\nResult ID: ${res.id}`);
        console.log(`Test ID: ${res.test_id}`);
        const log = res.answers_log;
        if (log) {
            const keys = Object.keys(log).slice(0, 5);
            console.log(`Keys: ${JSON.stringify(keys)}`);
            console.log(`Check: Are keys UUIDs? ${keys[0]?.length > 20}`);
        }
    }
}

inspectLog();
