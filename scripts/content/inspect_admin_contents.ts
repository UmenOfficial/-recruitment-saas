
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

async function inspectAdminContents() {
    const { data: contents, error } = await supabase
        .from('admin_contents')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching contents:', error);
        return;
    }

    if (!contents || contents.length === 0) {
        console.log('No contents found.');
    } else {
        console.log('Sample Content Keys:', Object.keys(contents[0]));
        console.log('Sample Content:', contents[0]);
    }
}

inspectAdminContents();
