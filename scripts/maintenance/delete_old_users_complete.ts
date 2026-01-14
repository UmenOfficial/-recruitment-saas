
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

async function deleteOldUsers() {
    const targetDate = '2026-01-11T00:00:00+09:00';
    console.log(`[Target] Deleting USERS created before ${targetDate}...`);

    // 1. Find target users from public.users table
    // Safety check: Exclude SUPER_ADMIN and ADMIN
    const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, email, role')
        .lt('created_at', targetDate)
        .neq('role', 'SUPER_ADMIN')
        .neq('role', 'ADMIN');

    if (fetchError) {
        console.error("Error fetching users:", fetchError);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No usage found to delete.");
        return;
    }

    console.log(`Found ${users.length} users to delete.`);

    // 2. Delete users loop
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
        try {
            console.log(`Deleting user: ${user.email} (${user.id}) ...`);

            // Delete from Auth (This usually cascades to public.users if configured)
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);

            if (authDeleteError) {
                console.error(`Failed to delete auth user ${user.email}:`, authDeleteError.message);
                // Try to delete from public.users manually if auth deletion fails (e.g. user not found in auth)
                console.log(`Attempting to delete from public.users manually...`);
                const { error: dbDeleteError } = await supabase.from('users').delete().eq('id', user.id);
                if (dbDeleteError) {
                    console.error(`Failed to delete public user ${user.email}:`, dbDeleteError.message);
                    failCount++;
                } else {
                    console.log(`Deleted from public.users manually.`);
                    successCount++;
                }
            } else {
                successCount++;
            }
        } catch (e: any) {
            console.error(`Exception deleting user ${user.email}:`, e.message);
            failCount++;
        }
    }

    console.log(`Finished.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

deleteOldUsers();
