
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTestNames() {
    const ids = [
        '77ff6903-41f4-4b1f-97e2-8f42746b10e4',
        'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e'
    ];

    const { data, error } = await supabase
        .from('tests')
        .select('id, title, type')
        .in('id', ids);

    if (error) console.error(error);
    else console.table(data);
}

checkTestNames();
