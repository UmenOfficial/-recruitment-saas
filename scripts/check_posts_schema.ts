
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .limit(1);

    if (data && data.length > 0) {
        console.log('Post Columns:', Object.keys(data[0]));
    } else {
        console.log('No posts found or error:', error);
    }
}
main();
