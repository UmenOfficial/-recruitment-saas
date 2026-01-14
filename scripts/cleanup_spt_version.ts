
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupVersion() {
    const versionName = 'SPT_160115';
    const targetTestId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';

    // Correct keys found via inspection
    const targetsToRemove = [
        'Scale_Comp_TOTAL',
        'Scale_Comp_애국심/헌신',
        'Scale_Comp_정보감각/보안의식',
        'Scale_Comp_책임감/전문지식'
    ];

    console.log(`Cleaning up version ${versionName}...`);
    console.log('Targets:', targetsToRemove);

    // 1. Get Version
    const { data: verData, error: verError } = await supabase
        .from('test_norm_versions')
        .select('*')
        .eq('version_name', versionName)
        .eq('test_id', targetTestId)
        .single();

    if (verError || !verData) {
        console.error('Error fetching version:', verError);
        return;
    }

    const snapshot = verData.active_norms_snapshot;

    const initialLength = snapshot.length;
    const cleanedSnapshot = snapshot.filter((item: any) => {
        return !targetsToRemove.includes(item.category_name);
    });

    const removedCount = initialLength - cleanedSnapshot.length;
    console.log(`Version Snapshot: Removed ${removedCount} items.`);

    if (removedCount > 0) {
        const { error: updateError } = await supabase
            .from('test_norm_versions')
            .update({ active_norms_snapshot: cleanedSnapshot })
            .eq('id', verData.id);

        if (updateError) console.error('Error updating version:', updateError);
        else console.log('Successfully updated version snapshot.');
    } else {
        console.log('No items matched for removal in Version (Try checking check_inspector again?).');
    }

    // 2. Clean Active Norms (test_norms)
    console.log('Cleaning active test_norms...');
    const { error: deleteError } = await supabase
        .from('test_norms')
        .delete()
        .eq('test_id', targetTestId)
        .in('category_name', targetsToRemove);

    if (deleteError) console.error('Error deleting active norms:', deleteError);
    else console.log('Successfully cleaned active norms.');
}

cleanupVersion();
