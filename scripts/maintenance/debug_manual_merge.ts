
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function debugManualMerge() {
    console.log('Testing Manual Merge Logic...');

    // 1. Fetch Posts
    const { data: posts, error: postsError } = await supabaseAdmin
        .from('posts')
        .select(`
            id,
            title,
            comments(count),
            user_id
        `)
        .limit(2);

    if (postsError) {
        console.error('Error fetching posts:', postsError);
        return;
    }
    console.log(`Fetched ${posts.length} posts.`);

    // 2. Extract User IDs
    const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));
    console.log('User IDs to fetch:', userIds);

    // 3. Fetch Users
    if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email')
            .in('id', userIds);

        if (usersError) {
            console.error('Error fetching users:', usersError);
        } else {
            console.log(`Fetched ${users?.length} users.`);
            console.log('Sample User:', users?.[0]);
        }
    } else {
        console.log('No user IDs found.');
    }
}

debugManualMerge();
