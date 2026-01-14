
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function saveVersion() {
    const targetTestId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e'; // Standard
    const versionName = 'SPT_160115';

    console.log(`Saving version ${versionName} for test ${targetTestId}...`);

    // 1. Fetch Current Norms
    const { data: currentNorms, error: fetchError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', targetTestId);

    if (fetchError || !currentNorms) {
        console.error('Error fetching current norms:', fetchError);
        return;
    }
    console.log(`Fetched ${currentNorms.length} active norms.`);

    // 2. Insert into test_norm_versions
    // Schema: test_id, version_name, active_norms_snapshot (JSONB), is_active (bool)
    const { data: verData, error: verError } = await supabase
        .from('test_norm_versions')
        .insert({
            test_id: targetTestId,
            version_name: versionName,
            description: 'Standard Personality Test norms (NIS derived + Hardcoded)',
            active_norms_snapshot: currentNorms, // Store as JSON
            is_active: true // Set as active version
        })
        .select()
        .single();

    if (verError) {
        console.error('Error creating version:', verError);
        return;
    }

    console.log(`Successfully saved version '${versionName}'. ID: ${verData.id}`);
}

saveVersion();
