
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRelation() {
    console.log('Testing posts -> comments(count) relation...');

    const { data, error } = await supabase
        .from('posts')
        .select(`
            id,
            title,
            comments(count)
        `)
        .limit(1);

    if (error) {
        console.error('Detailed Supabase Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success!', data);
    }
}

debugRelation();
