
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectNorms() {
    console.log('Fetching norms for 개방성...');

    // Check test_norms for category_name = '개방성' (or 'Scale_개방성' if prefixed)
    // We'll search liberally
    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('*')
        .ilike('category_name', '%개방성%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${norms.length} norms.`);
    norms.forEach(n => {
        console.log(`\nScale: ${n.category_name} (Test ID: ${n.test_id})`);
        console.log(`Mean: ${n.mean_value}, SD: ${n.std_dev_value}`);
    });
}

inspectNorms();
