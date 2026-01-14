
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTests() {
    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tests:', error);
        return;
    }

    console.log('--- All Tests ---');
    data.forEach((t: any) => {
        console.log(`ID: ${t.id}, Title: "${t.title}", Type: ${t.type}, CreatedAt: ${t.created_at}`);
    });
}

inspectTests();
