
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugMapping() {
    console.log('--- Simulating fetchCandidatesList ---');

    // 1. Fetch Users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (userError || !users) {
        console.error('User Fetch Error:', userError);
        return;
    }

    // 2. Fetch Results
    const userIds = users.map(u => u.id);
    const { data: results, error: resError } = await supabase
        .from('test_results')
        .select(`
            id, user_id, test_id, total_score, t_score, completed_at, attempt_number,
            tests ( title, type )
        `)
        .in('user_id', userIds)
        .order('completed_at', { ascending: false });

    if (resError) {
        console.error('Result Fetch Error:', resError);
        return;
    }

    // 3. Perform Mapping
    const formatted = users.map(user => {
        const userResults = (results || [])
            .filter((r: any) => r.user_id === user.id)
            .map((r: any) => ({
                id: r.id,
                test_title: r.tests?.title,
                completed_at: r.completed_at
            }));

        return {
            user_email: user.email,
            user_id: user.id,
            result_count: userResults.length,
            results: userResults
        };
    });

    // 4. Output Mismatches or Weirdness
    console.log('--- Mapping Check ---');
    formatted.forEach(u => {
        if (u.result_count > 0) {
            console.log(`User: ${u.user_email} (${u.user_id})`);
            u.results.forEach(r => {
                console.log(`  - Result: ${r.test_title} (${r.completed_at}) [ID: ${r.id}]`);
            });
        }
    });
}

debugMapping();
