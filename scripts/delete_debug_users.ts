
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Must use service role key for admin actions
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function deleteDebugUsers() {
    console.log('--- Deleting Debug Users ---');

    // Find users to delete
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', 'debug.user.%');

    if (error) {
        console.error('Error finding users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No debug users found.');
        return;
    }

    console.log(`Found ${users.length} debug users.`);
    let successCount = 0;

    for (const user of users) {
        console.log(`Deleting user: ${user.email} (${user.id})`);

        // 0. Explicitly delete related test_results first
        const { error: resultError } = await supabase
            .from('test_results')
            .delete()
            .eq('user_id', user.id);

        if (resultError) {
            console.log(`  Warning: Failed to delete test_results: ${resultError.message}`);
        } else {
            console.log(`  Related test_results deleted.`);
        }

        // 1. Delete from auth.users (Cascades to public.users)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error(`  Failed to delete auth user ${user.id}:`, deleteError.message);

            // Fallback: Try deleting from public table directly
            console.log('  Attempting to delete from public table directly...');
            const { error: publicDeleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', user.id);

            if (publicDeleteError) {
                console.error(`  Also failed to delete public user:`, publicDeleteError.message);
            } else {
                console.log(`  Deleted from public table successfully.`);
                successCount++;
            }
        } else {
            console.log(`  Deleted successfully (Auth & Public).`);
            successCount++;
        }
    }
    console.log(`\nOperation Complete. Deleted ${successCount} / ${users.length} users.`);
}

deleteDebugUsers();
