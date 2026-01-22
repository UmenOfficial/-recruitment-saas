
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function listTables() {
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // information_schema might not be accessible via client sometimes depending on RLS/Permissions even with service role?
        // Actually usually works.
        console.error(error);
        // Fallback: try rpc if exists, or just basic fetch from known tables
    } else {
        console.log('Tables:', data?.map(t => t.table_name).join(', '));
    }
}

listTables();
