
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkCommunity() {
    console.log('--- Checking Community Schema & Data ---\n');

    // 1. Posts
    const { data: posts, error: pErr } = await supabase.from('posts').select('*');
    if (pErr) {
        console.error('Error fetching posts:', pErr.message);
    } else {
        console.log(`Found ${posts?.length} posts.`);
        if (posts && posts.length > 0) {
            console.log('Sample Post Keys:', Object.keys(posts[0]).join(', '));
            console.log('Sample Post:', JSON.stringify(posts[0], null, 2));
        }
    }

    // 2. Comments
    const { data: comments, error: cErr } = await supabase.from('comments').select('*');
    if (cErr) {
        console.error('Error fetching comments:', cErr.message);
    } else {
        console.log(`\nFound ${comments?.length} comments.`);
        if (comments && comments.length > 0) {
            console.log('Sample Comment Keys:', Object.keys(comments[0]).join(', '));
            console.log('Sample Comment:', JSON.stringify(comments[0], null, 2));
        } else {
            console.log('No comments found in the table.');
        }
    }
}

checkCommunity();
