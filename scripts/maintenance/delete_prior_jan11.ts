
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
    const targetDate = '2026-01-11T00:00:00+09:00'; // KST
    console.log(`[Target] Deleting test_results created before ${targetDate}...`);

    // 1. Delete test_results
    const { count, error: countError } = await supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', targetDate);

    if (countError) {
        console.error("Error counting records:", countError);
        return;
    }

    if (!count || count === 0) {
        console.log("No records found to delete.");
        return;
    }

    console.log(`Found ${count} records. Deleting...`);

    const { error: deleteError } = await supabase
        .from('test_results')
        .delete()
        .lt('created_at', targetDate);

    if (deleteError) {
        console.error("Error deleting records:", deleteError);
    } else {
        console.log(`Successfully deleted ${count} records from test_results.`);
    }
}

cleanup();
