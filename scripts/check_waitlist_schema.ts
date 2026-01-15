
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWaitlist() {
    console.log("--- Checking Waitlist Schema ---");

    // Attempt to select 'agreed_privacy' from a row, or just any row
    const { data, error } = await supabaseAdmin
        .from('waitlist')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error accessing waitlist:", error);
    } else if (data && data.length > 0) {
        const row = data[0];
        console.log("Found row keys:", Object.keys(row));
        if ('agreed_privacy' in row) {
            console.log("✅ 'agreed_privacy' column EXISTS.");
        } else {
            console.log("❌ 'agreed_privacy' column MISSING.");
        }
    } else {
        console.log("⚠️ No data in waitlist to check columns directly.");
        // Try checking error by selecting the specific column
        const { error: colError } = await supabaseAdmin.from('waitlist').select('agreed_privacy').limit(1);
        if (colError) {
            console.log("❌ 'agreed_privacy' column MISSING (Select failed).", colError.message);
        } else {
            console.log("✅ 'agreed_privacy' column EXISTS (Select success).");
        }
    }
}

checkWaitlist();
