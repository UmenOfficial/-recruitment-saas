
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectLiveSchema() {
    console.log("--- Inspecting public.users Schema ---");
    // Unfortunately we can't easily get DDL via JS client.
    // We can try to insert a dummy user into public.users and see if it fails (and why).
    // Note: This won't test the Trigger itself, but will test the Table constraints.

    const dummyId = '00000000-0000-0000-0000-000000000000'; // Invalid UUID? No, perfectly valid.
    const dummyEmail = 'debug_test_123@example.com';

    console.log("Attempting direct insert into public.users...");

    // We need to delete it first if exists (cleanup)
    await supabase.from('users').delete().eq('id', dummyId);

    const { data, error } = await supabase
        .from('users')
        .insert({
            id: dummyId,
            email: dummyEmail,
            full_name: 'Debug User',
            role: 'CANDIDATE' // Trying the role used in trigger
        })
        .select();

    if (error) {
        console.error("Direct Insert Failed:", error);
    } else {
        console.log("Direct Insert Success:", data);
        // Cleanup
        await supabase.from('users').delete().eq('id', dummyId);
    }

    console.log("\n--- Checking Triggers on public.users (Indirectly) ---");
    // Can't check triggers directly.

    // Let's check if we can simulate the trigger logic issue by passing NULLs
    console.log("Attempting insert with NULL email...");
    const { error: errorNull } = await supabase
        .from('users')
        .insert({
            id: '00000000-0000-0000-0000-000000000000',
            email: null, // Test NOT NULL
            role: 'CANDIDATE'
        });
    console.log("Insert NULL Email Result:", errorNull ? errorNull.message : "Success");

    console.log("Attempting insert with Invalid Role...");
    const { error: errorRole } = await supabase
        .from('users')
        .insert({
            id: '00000000-0000-0000-0000-000000000000',
            email: 'valid@test.com',
            role: 'INVALID_ROLE'
        });
    console.log("Insert Invalid Role Result:", errorRole ? errorRole.message : "Success");
}

inspectLiveSchema();
