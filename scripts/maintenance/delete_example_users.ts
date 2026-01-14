
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials (SERVICE_KEY required for user deletion)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteExampleUsers() {
    const pattern = '%@example.com';
    console.log(`[Target] Deleting ALL users with email pattern: ${pattern}`);

    // 1. Find target users from public.users table
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, email, role')
        .like('email', pattern);

    if (fetchError) {
        console.error("Error fetching users:", fetchError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found with that email pattern.");
        return;
    }

    console.log(`Found ${users.length} users to delete.`);

    // 3. Prepare for deletion
    const userIds = users.map(u => u.id);

    // 3.1 Delete test_results first (Constraint Fix)
    console.log(`Deleting test_results for ${userIds.length} users...`);
    const { error: resultDeleteError } = await supabase
        .from('test_results')
        .delete()
        .in('user_id', userIds);

    if (resultDeleteError) {
        console.error("Error deleting test_results:", resultDeleteError);
        // We might continue or stop? Try to continue as some users might not have results
    } else {
        console.log("Deleted associated test_results.");
    }

    // 4. Delete users loop
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
        try {
            console.log(`Processing user: ${user.email} (${user.id}) ...`);

            // 1. Try Delete from Auth
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);

            if (authDeleteError) {
                // console.log(`Auth delete note for ${user.email}: ${authDeleteError.message} (Proceeding to public delete)`);
            }

            // 2. ALWAYS Force Delete from public.users
            const { error: dbDeleteError } = await supabase.from('users').delete().eq('id', user.id);

            if (dbDeleteError) {
                console.error(`Failed to delete public user ${user.email}:`, dbDeleteError.message);
                failCount++;
            } else {
                // console.log(`Public delete success for ${user.email}`);
                successCount++;
            }

        } catch (e: any) {
            console.error(`Exception processing user ${user.email}:`, e.message);
            failCount++;
        }
    }

    console.log(`Finished.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

deleteExampleUsers();
