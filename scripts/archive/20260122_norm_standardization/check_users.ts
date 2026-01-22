
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkUsers() {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log(`Total Users: ${users?.length}`);
    const admins = users?.filter((u: any) => u.role === 'ADMIN' || u.is_admin === true); // Check common admin flags
    console.log('Admins:', admins?.map((u: any) => ({ id: u.id, email: u.email, name: u.name })));
}

checkUsers();
