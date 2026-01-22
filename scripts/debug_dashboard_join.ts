
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role to rule out RLS first?
    // No, I want to simulate User behavior to see the error.
    // BUT I can't simulate User Auth easily in script without login.
    // So I'll use Service Role first to verify Query Syntax is correct.
    // If Service Role fails, it's Syntax/schema.
    // If Service Role succeeds, it's RLS/Permissions.
);

async function checkJoin() {
    console.log("Testing Dashboard Query with Service Role...");

    const userId = '6cf05832-cffa-4862-ba0e-a2a506c09b1d'; // prodaum6660

    const { data, error } = await supabase
        .from("test_results")
        .select(`
            id,
            total_score,
            completed_at,
            created_at,
            test_id,
            tests ( id, title, type, description )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Link Query Failed:", error);
    } else {
        console.log("✅ Link Query Success! Rows:", data?.length);
        if (data && data.length > 0) {
            console.log("Sample Row tests:", data[0].tests);
        }
    }
}

checkJoin();
