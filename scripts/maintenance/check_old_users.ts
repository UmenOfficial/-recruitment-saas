
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOldUsers() {
    const targetDate = '2026-01-11T00:00:00+09:00';
    console.log(`Checking users created before ${targetDate}...`);

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .lt('created_at', targetDate);

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No users found created before target date.");
    } else {
        console.log(`Found ${users.length} users created before ${targetDate}:`);
        users.forEach(u => {
            console.log(`- [${u.role}] ${u.email} (Created: ${u.created_at})`);
        });
    }
}

checkOldUsers();
