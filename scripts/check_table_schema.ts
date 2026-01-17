
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function main() {
    const table = process.argv[2];
    if (!table) {
        console.error('Please provide a table name');
        process.exit(1);
    }
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log(`Schema check for ${table}:`, data && data.length > 0 ? Object.keys(data[0]) : 'Empty table or no access');
    }
}
main();
