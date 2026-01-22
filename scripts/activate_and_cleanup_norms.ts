
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function activateAndCleanup() {
    console.log('--- Activating Standardized Versions & Cleaning Up ---\n');

    const TARGET_VERSIONS = ['NIS_260122', 'Standard_260122'];

    // 1. Fetch Versions
    const { data: versions } = await supabase
        .from('test_norm_versions')
        .select('*')
        .in('version_name', TARGET_VERSIONS);

    if (!versions || versions.length === 0) {
        console.error('Target versions not found.');
        return;
    }

    for (const v of versions) {
        console.log(`Processing Version: ${v.version_name} (Test ID: ${v.test_id})`);

        // 2. DELETE ALL existing norms for this test
        const { error: delError } = await supabase
            .from('test_norms')
            .delete()
            .eq('test_id', v.test_id);

        if (delError) {
            console.error(`  Error clearing norms: ${delError.message}`);
            continue;
        }
        console.log('  - Cleared existing norms.');

        // 3. INSERT snapshot norms
        const snapshot = v.active_norms_snapshot;
        if (snapshot && snapshot.length > 0) {
            // Ensure snapshot items have test_id (they should, but safe to enforce)
            const toInsert = snapshot.map((n: any) => ({
                test_id: v.test_id,
                category_name: n.category_name,
                mean_value: n.mean_value,
                std_dev_value: n.std_dev_value
            }));

            const { error: insError } = await supabase
                .from('test_norms')
                .insert(toInsert);

            if (insError) {
                console.error(`  Error inserting norms: ${insError.message}`);
            } else {
                console.log(`  - Inserted ${toInsert.length} standardized norms.`);
            }
        }

        // 4. Mark Version as Active
        await supabase
            .from('test_norm_versions')
            .update({ is_active: false })
            .eq('test_id', v.test_id); // Deactivate others

        await supabase
            .from('test_norm_versions')
            .update({ is_active: true })
            .eq('id', v.id); // Activate this one

        console.log('  - Set version as Active.');
    }
}

activateAndCleanup();
