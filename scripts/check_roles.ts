
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data, error } = await supabase.from('users').select('role');
    if (error) {
        console.error(error);
    } else if (data) {
        const roles = new Set(data.map(u => u.role));
        console.log("Distinct roles:", Array.from(roles));
    }
}
run();
