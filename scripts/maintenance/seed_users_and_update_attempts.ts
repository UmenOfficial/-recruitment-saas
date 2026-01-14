
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Use Service Role Client for Admin Auth
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seedUsersAndUpdate() {
    console.log("Searching for test 'NIS Customizing Test'...");
    const { data: tests } = await supabase.from('tests').select('id').ilike('title', '%NIS%Customizing%');
    const testId = tests?.[0]?.id;
    if (!testId) { console.error("Test not found"); return; }

    // 1. Fetch seeded results (attempt >= 1000)
    const { data: results } = await supabase
        .from('test_results')
        .select('id, user_id, attempt_number')
        .eq('test_id', testId)
        .gte('attempt_number', 1000);

    if (!results || results.length === 0) { console.log("No seeded results found."); return; }
    console.log(`Found ${results.length} seeded results to migrate.`);

    // 2. Create Users and Update
    console.log("Creating dummy users and updating results...");

    // We process in chunks to avoid rate limits
    const CHUNK_SIZE = 10;
    let updatedCount = 0;

    for (let i = 0; i < results.length; i += CHUNK_SIZE) {
        const chunk = results.slice(i, i + CHUNK_SIZE);

        await Promise.all(chunk.map(async (res, idx) => {
            const email = `seed_user_${Date.now()}_${i + idx}@example.com`;
            const password = 'Password123!';

            // Create User
            const { data: userData, error: userError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (userError || !userData.user) {
                console.error(`Failed to create user ${email}:`, userError);
                return;
            }

            const newUserId = userData.user.id;

            // Wait for trigger? 
            // Often public.users is populated via trigger.
            // But we can update test_results immediately if FK is to auth.users.
            // If FK is to public.users, we typically wait or manually insert if no trigger.
            // Assuming standard Supabase setup (FK to auth.users OR trigger works fast).

            // Try Update test_results
            const { error: updateError } = await supabase
                .from('test_results')
                .update({
                    user_id: newUserId,
                    attempt_number: 1
                })
                .eq('id', res.id);

            if (updateError) {
                console.error(`Failed to update result ${res.id}:`, updateError);
                // Clean up user?
                await supabase.auth.admin.deleteUser(newUserId);
            } else {
                updatedCount++;
            }
        }));

        process.stdout.write(`.`);
        if ((i + CHUNK_SIZE) % 50 === 0) console.log(` ${updatedCount} done`);
    }

    console.log(`\nMigration Complete. Updated ${updatedCount}/${results.length} records.`);
}

seedUsersAndUpdate();
