
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPosts() {
    console.log('Inspecting posts table...');

    // 1. Fetch one post to see columns
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching posts:', error);
    } else {
        console.log('Sample Post keys:', posts && posts.length > 0 ? Object.keys(posts[0]) : 'No posts found');
        if (posts && posts.length > 0) {
            console.log('Sample Post:', posts[0]);
        }
    }
}

inspectPosts();
