
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPostFetch() {
    console.log('Testing fetchPostDetail query...');
    const id = '9cc6331f-9c2d-44cf-9db3-2a0410deba21';

    const { data, error } = await supabase
        .from('posts')
        .select(`
            *,
            comments (
                id, content, created_at, user_id,
                users ( role )
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Query Failed:', error);
    } else {
        console.log('Query Success:', data ? 'Data found' : 'No data');
        if (data && data.comments) {
            console.log('Comments:', JSON.stringify(data.comments, null, 2));
        }
    }
}

debugPostFetch();
