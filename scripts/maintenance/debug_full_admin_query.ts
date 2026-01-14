
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Using verified key
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function debugFullQuery() {
    console.log('Testing FULL Admin Query with Service Role...');

    // Exact query from actions.ts
    const { data, error } = await supabaseAdmin
        .from('posts')
        .select(`
            id,
            title,
            comments(count),
            users (full_name, email)
        `)
        .limit(1);

    if (error) {
        console.error('Detailed Supabase Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success!', JSON.stringify(data, null, 2));
    }
}

debugFullQuery();
