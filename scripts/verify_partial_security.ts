
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifySecurity() {
    console.log("--- Verifying Partial Security Status ---");

    // 1. Check 'guest_access_tokens' (Should be BLOCKED for Anon)
    // This table was enabled in fix_security_advisor_phase2.sql and NOT disabled in emergency fix.
    const { data: guestData, error: guestError } = await supabaseAnon
        .from('guest_access_tokens')
        .select('*')
        .limit(5);

    if (guestError) {
        // If RLS is ON and no policy allows Select, this might return an empty list OR error?
        // Usually returns Empty List [] if policy exists but denies access.
        // Returns Error if RLS is OFF but table privs are missing (unlikely).
        console.log(`[GuestTokens] Result: Error (${guestError.message})`);
    } else {
        console.log(`[GuestTokens] Result: ${guestData.length} rows.`);
        if (guestData.length === 0) {
            console.log("✅ GuestTokens: RLS is likely ON (Access Denied/Empty).");
        } else {
            console.log("⚠️ GuestTokens: RLS might be OFF (Data visible).");
        }
    }

    // 2. Check 'companies' (Should be VISIBLE but Protected?)
    // Usually companies are public read.
    const { data: compData, error: compError } = await supabaseAnon
        .from('companies')
        .select('*')
        .limit(1);

    console.log(`[Companies] Result: ${compData?.length} rows.`);

    // 3. Confirm 'users' is OPEN (Expected from emergency fix)
    const { data: userData } = await supabaseAnon
        .from('users')
        .select('id')
        .limit(1);

    if (userData && userData.length > 0) {
        console.log("ℹ️ Users: Data is visible (RLS Disabled as expected).");
    }
}

verifySecurity();
