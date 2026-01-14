
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Fixing Seeded Users (Creating Dummy Apps & Linking) ---");

    // 1. Find Test
    const { data: test } = await supabase
        .from('tests')
        .select('id')
        .like('title', '%Sample Test: ver2%')
        .single();
    if (!test) return;

    // 2. Find a valid Posting ID
    const { data: posting } = await supabase.from('postings').select('id').limit(1).maybeSingle();
    const postingId = posting?.id;
    if (!postingId) { console.error("No usage posting found to link apps."); return; }

    // 3. Find records with NULL user_id (the seeded ones)
    const { data: results, error } = await supabase
        .from('test_results')
        .select('id')
        .eq('test_id', test.id)
        .is('user_id', null);

    if (error) { console.error("Fetch error:", error); return; }
    if (!results || results.length === 0) { console.log("No null user records found."); return; }

    console.log(`Found ${results.length} records with NULL user_id.`);
    console.log("Creating dummy Applications (null user) and updating Test Results...");

    let count = 0;
    for (const r of results) {
        // newUid is NOT used because we set user_id to null
        const newAppId = randomUUID();

        // Insert Dummy Application
        const { error: appError } = await supabase.from('applications').insert({
            id: newAppId,
            posting_id: postingId,
            user_id: null, // Allow null user
            name: 'Dummy User',
            status: 'APPLIED',
            pii_email_encrypted: 'dummy_enc',
            pii_phone_encrypted: 'dummy_enc',
            pii_address_encrypted: 'dummy_enc',
            blind_mode_enabled: true
        });

        if (appError) {
            console.error(`Failed to create app for ${r.id}:`, appError);
            continue;
        }

        // Update Test Result
        const { error: updateError } = await supabase
            .from('test_results')
            .update({
                user_id: null,
                application_id: newAppId,
                attempt_number: 1
            })
            .eq('id', r.id);

        if (updateError) {
            console.error(`Failed to update ${r.id}:`, updateError);
        } else {
            count++;
        }

        if (count % 50 === 0 && count > 0) console.log(`Updated ${count}...`);
    }

    console.log(`Done. Updated ${count} records.`);
}

main();
