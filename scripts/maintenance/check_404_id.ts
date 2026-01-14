
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkId() {
    const id = 'bf66ccdb-40f6-47ce-aebf-a9f8ca0f79cb';
    console.log(`Checking ID: ${id}`);
    const { data } = await supabase.from('test_results').select('id').eq('id', id).single();

    if (data) console.log("FOUND");
    else console.log("NOT FOUND");
}

checkId();
