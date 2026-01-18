
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting posts:', error);
    } else {
        console.log(`Total Posts: ${count}`);
    }
}
main();
