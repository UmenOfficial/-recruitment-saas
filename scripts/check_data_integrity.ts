
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Use Service Role to ensure we can see all data
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkIntegrity() {
    console.log('--- Checking User <-> Result Integrity ---');

    console.log('Fetching Users...');
    // 1. Fetch all users (All columns to inspect schema)
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*');

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found.');
        return;
    }

    console.log(`Total Users: ${users.length}`);
    console.log('Sample User Columns:', Object.keys(users[0]).join(', '));
    console.log('Sample User Data (First 1):', users[0]);

    console.log('\nFetching Results...');
    // 2. Fetch all test results
    const { data: results, error: resultError } = await supabase
        .from('test_results')
        .select(`
            id,
            user_id,
            test_id,
            created_at,
            completed_at,
            tests ( title )
        `);

    if (resultError) {
        console.error('Error fetching results:', resultError);
        return;
    }

    console.log(`Total Results: ${results?.length}`);

    // 3. Analyze Mismatches
    let orphanedResults = 0;
    let mappedResults = 0;
    const userResultCounts: Record<string, number> = {};
    const unmappedUserIds = new Set<string>();

    results?.forEach((r: any) => {
        const user = users.find(u => u.id === r.user_id);
        if (!user) {
            orphanedResults++;
            unmappedUserIds.add(r.user_id);
        } else {
            mappedResults++;
            const ident = user.email || user.id;
            userResultCounts[ident] = (userResultCounts[ident] || 0) + 1;
        }
    });

    console.log(`\nAnalysis:`);
    console.log(`- Valid Mapped Results: ${mappedResults}`);
    console.log(`- Orphaned Results: ${orphanedResults}`);

    if (orphanedResults > 0) {
        console.log(`- Orphaned User IDs (First 5):`);
        Array.from(unmappedUserIds).slice(0, 5).forEach(uid => console.log(`  ${uid}`));
    }

    console.log(`\nResults per User (Top 10):`);
    Object.entries(userResultCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([email, count]) => {
            console.log(`${email}: ${count} results`);
        });
}

checkIntegrity();
