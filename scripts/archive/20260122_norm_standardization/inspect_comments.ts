
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspectComments() {
    console.log('--- Inspecting Comments & Posts ---\n');

    // 1. Check Posts
    const { data: posts, error: pErr } = await supabase
        .from('posts')
        .select('id, title, comment_count');

    if (pErr) console.error('Post Error:', pErr);
    console.log(`Total Posts: ${posts?.length || 0}`);
    posts?.forEach(p => console.log(`Post [${p.id}] "${p.title}" (Count: ${p.comment_count})`));

    // 2. Check Comments
    const { data: comments, error: cErr } = await supabase
        .from('comments')
        .select('*');

    if (cErr) console.error('Comment Error:', cErr);
    console.log(`\nTotal Comments: ${comments?.length || 0}`);

    comments?.forEach(c => {
        const parentPost = posts?.find(p => p.id === c.post_id);
        const status = parentPost ? 'LINKED' : 'ORPHANED';
        console.log(`Comment [${c.id}] on Post [${c.post_id}] -> ${status}: "${c.content}"`);
    });
}

inspectComments();
