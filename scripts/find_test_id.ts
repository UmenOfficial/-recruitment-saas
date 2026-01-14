
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findTest() {
    const title = process.argv[2];
    console.log(`Searching for test with title: ${title}`);

    const { data, error } = await supabase
        .from('tests')
        .select('*')
        .ilike('title', `%${title}%`);

    if (error) {
        console.error(error);
        return;
    }

    console.log('Found tests:', data);
}

findTest();
