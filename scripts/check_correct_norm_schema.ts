
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCorrectSchema() {
    console.log("Checking test_norm_versions table...");
    const { data: vData, error: vError } = await supabase
        .from('test_norm_versions')
        .select('*')
        .limit(1);

    if (vError) console.error('test_norm_versions error:', vError.message);
    else console.log('test_norm_versions sample:', vData);

    console.log("\nChecking test_norm_version_items table...");
    // Assuming the item table follows the same naming pattern or similar
    const { data: iData, error: iError } = await supabase
        .from('test_norm_version_items')
        .select('*')
        .limit(1);

    if (iError) {
        console.error('test_norm_version_items error:', iError.message);
        // Try another guess?
        const { error: iError2 } = await supabase.from('test_norm_items').select('*').limit(1);
        if (iError2) console.error('test_norm_items error:', iError2.message);
    }
    else console.log('test_norm_version_items sample:', iData);
}

checkCorrectSchema();
