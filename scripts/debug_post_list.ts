
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Anon key to simulate guest/client

// We might want to test as SERVICE ROLE too to see if it's RLS
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function debugPostList() {
    console.log('--- Testing fetchPosts with ANON KEY ---');
    const anonClient = createClient(supabaseUrl, supabaseKey);
    const { data: anonData, error: anonError } = await anonClient
        .from('posts')
        .select(`
            id, title, category,
            comments (count)
        `)
        .eq('category', 'QNA')
        .limit(5);

    if (anonError) console.error('Anon Error:', anonError);
    else {
        console.log('Anon Data Sample:', JSON.stringify(anonData, null, 2));
    }

    console.log('\n--- Testing fetchPosts with SERVICE ROLE KEY ---');
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: serviceData, error: serviceError } = await serviceClient
        .from('posts')
        .select(`
            id, title, category,
            comments (count)
        `)
        .eq('category', 'QNA')
        .limit(5);

    if (serviceError) console.error('Service Error:', serviceError);
    else {
        console.log('Service Data Sample:', JSON.stringify(serviceData, null, 2));
    }
}

debugPostList();
