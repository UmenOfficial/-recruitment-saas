
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserResults(email: string) {
    console.log(`Checking results for user: ${email}`);

    // 1. Get User ID
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    if (userError || !users) {
        console.error('User not found:', userError);
        return;
    }

    const userId = users.id;
    console.log(`User ID: ${userId}`);

    // 2. Get Test Results
    const { data: results, error: resultError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

    if (resultError) {
        console.error('Error fetching results:', resultError);
        return;
    }

    console.log(`Found ${results.length} results.`);
    results.forEach((r, idx) => {
        console.log(`[Result ${idx + 1}]`);
        console.log(`  ID: ${r.id}`);
        console.log(`  Test ID: ${r.test_id}`);
        console.log(`  Started At: ${r.started_at}`);
        console.log(`  Completed At: ${r.completed_at}`);
        console.log(`  Attempt Number: ${r.attempt_number}`);
        console.log(`  Status: ${r.completed_at ? 'COMPLETED' : 'IN_PROGRESS'}`);
    });
}

checkUserResults('prodaum6660@gmail.com');
