
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data, error } = await supabase
        .from('posts')
        .select('id, title, category');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Posts:', data);
        const secretPosts = data.filter(p => p.category === 'QNA');
        console.log(`Secret (QNA) Posts: ${secretPosts.length}`);
    }
}
main();
