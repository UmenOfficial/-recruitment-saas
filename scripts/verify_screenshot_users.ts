
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyScreenshotUsers() {
    console.log('--- Verifying Scores for Screenshot Candidates ---');

    console.log('--- Listing Recent Users ---');

    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found in DB.');
        return;
    }

    // Process users to add a display name
    const processedUsers = users.map(u => ({
        ...u,
        name: u.email // Fallback since name column might not exist
    }));

    console.log(`Found ${users.length} recent users:`);
    processedUsers.forEach(u => console.log(`- ${u.email}`));

    // Now verify results for THESE users
    const { data: results } = await supabase
        .from('test_results')
        .select('user_id, total_score, detailed_scores, test_id')
        .in('user_id', users.map(u => u.id));

    if (!results) {
        console.log('No results found for these users.');
        return;
    }

    const userbMap = new Map(users.map(u => [u.id, u]));

    results.forEach(r => {
        const u = userbMap.get(r.user_id);
        if (!u) return;

        console.log(`\nUser: ${u.name} (${u.email})`);
        console.log(`Total Score (DB Column): ${r.total_score}`);

        const details = r.detailed_scores as any;
        if (details && details.competencies) {
            console.log('Competency Scores (Detailed JSON):');
            Object.entries(details.competencies).forEach(([k, v]: [string, any]) => {
                const val = typeof v === 'number' ? v : (v.t_score || v.raw || v.score);
                console.log(`  - ${k}: ${val}`);
            });
        } else {
            console.log('  (No detailed competency scores found)');
        }
    });

    console.log('\n--- Verification Complete ---');
    console.log('Expected Ranges: Total ~150, Competencies ~250');
}

verifyScreenshotUsers();
