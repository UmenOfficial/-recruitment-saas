
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkUser() {
    console.log('--- Inspecting User ---\n');
    const email = 'guest_2f8df5d9-f86e-4b40-924b-305f1e020191@umen.cloud';

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error(error);
        return;
    }

    if (users && users.length > 0) {
        console.log('User found:', users[0]);
    } else {
        console.log('User not found in DB.');
    }
}

checkUser();
