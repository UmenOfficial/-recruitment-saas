
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkApplications() {
    console.log("Checking applications...");

    // 1. Get the latest user (assuming the user is logged in locally mostly as the latest one or similar context)
    // Actually, explicit user ID or email is better. I'll list all users and their applications briefly.

    // Fetch a few users
    const { data: users, error: uError } = await supabase.auth.admin.listUsers({ perPage: 5 });
    if (uError) {
        console.error("Error fetching users:", uError);
        return;
    }

    console.log(`Found ${users.users.length} users.`);

    for (const user of users.users) {
        console.log(`\nUser: ${user.email} (${user.id})`);

        const { data: apps, error: aError } = await supabase
            .from('applications')
            .select('id, status, created_at')
            .eq('user_id', user.id);

        if (aError) {
            console.error("  Error fetching apps:", aError);
        } else {
            console.log(`  Applications (${apps.length}):`, apps);
        }
    }
}

checkApplications();
