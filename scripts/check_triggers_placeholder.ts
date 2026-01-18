
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkTriggers() {
    console.log('--- Checking Triggers ---');

    // We can't easily query information_schema or system catalogs via REST unless we have a function or RAW SQL access.
    // However, if we assume the user has to run SQL manually, we can generate a SQL script for them to run and tell us the output.
    // But let's try to query 'information_schema.triggers' just in case RLS allows it (it won't for triggers usually).

    // Actually, the error "Invalid login credentials" is VERY specific to Auth.
    // It almost always means Wrong Password or User Not Found.
    // If it was a trigger error, it would usually say "Database error saving new user" or "Error in trigger..."

    console.log("Generating SQL to check triggers...");

    const checkTriggerSQL = `
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('public', 'auth')
ORDER BY event_object_table, trigger_name;
    `;

    console.log("\nPlease run the following SQL in Supabase Dashboard SQL Editor to see active triggers:\n");
    console.log(checkTriggerSQL);
}

checkTriggers();
