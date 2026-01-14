
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTest() {
    const { data: tests, error } = await supabase
        .from('tests')
        .select('id, title, type')
        .ilike('title', '%NIS%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (tests && tests.length > 0) {
        console.log('Found Tests:');
        tests.forEach(t => console.log(`- [${t.id}] ${t.title} (${t.type})`));
    } else {
        console.log('No tests found matching "NIS"');
    }
}

findTest();
