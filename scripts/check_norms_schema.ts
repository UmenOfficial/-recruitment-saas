
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkNormsSchema() {
    const { data, error } = await supabase.from('test_norms').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Sample Norm:', data ? data[0] : 'None');
}

checkNormsSchema();
