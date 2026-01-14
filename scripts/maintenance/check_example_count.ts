
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

async function checkCount() {
    const pattern = '%@example.com';
    console.log(`Checking count of users with email pattern: ${pattern}`);

    // Count is not directly supported easily with simple select in JS client without head:true or count param
    // But let's just fetch id
    const { data: users, error, count } = await supabase
        .from('users')
        .select('id, email, created_at', { count: 'exact' })
        .like('email', pattern);

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Found ${count} users matching pattern.`);
    if (users && users.length > 0) {
        console.log("Sample users:");
        users.slice(0, 5).forEach(u => console.log(`- ${u.email} (${u.created_at})`));
    }
}

checkCount();
