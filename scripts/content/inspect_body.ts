
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectContent() {
    const id = 'bc951174-6a03-45fb-a9f3-07ceb7a66b9b';
    console.log(`Inspecting content for ID: ${id}`);

    const { data, error } = await supabase
        .from('admin_contents')
        .select('title, body, type')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Title:', data.title);
        console.log('Type:', data.type);
        console.log('Body Raw Check:');
        console.log(JSON.stringify(data.body)); // JSON stringify to see \n characters
    }
}

inspectContent();
