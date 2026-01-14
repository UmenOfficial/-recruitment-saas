
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTotalNorm() {
    const testId = '77ff6903-41f4-4b1f-97e2-8f42746b10e4';

    // Check for any norm with TOTAL in name
    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', testId)
        .ilike('category_name', '%TOTAL%');

    if (error) {
        console.error(error);
        return;
    }

    console.log('Total Norms Found:', norms);
}

checkTotalNorm();
