
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
    console.log('Probing applications schema...');

    // Select one row completely
    const { data: rows, error } = await supabase.from('applications').select('*').limit(1);
    if (error) { console.error('Select error:', error); return; }

    if (rows && rows.length > 0) {
        console.log('Columns found:', Object.keys(rows[0]));
        console.log('Sample row:', rows[0]);
    } else {
        console.log('Table seems empty, cannot infer columns.');
    }
}
main();
