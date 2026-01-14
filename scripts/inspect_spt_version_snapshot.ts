
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectSnapshot() {
    const versionName = 'SPT_160115';
    const targetTestId = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';

    console.log(`Inspecting version ${versionName}...`);

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
    if (!Array.isArray(snapshot)) {
        console.log('Snapshot is not an array:', snapshot);
        return;
    }

    console.log(`Snapshot contains ${snapshot.length} items.`);

    // Print all category names to check for typos/invisible chars
    console.log("Categories found:");
    snapshot.forEach((item: any) => {
        // Only print if it contains 'Comp' or 'Total' to avoid noise
        if (item.category_name.toLowerCase().includes('comp') || item.category_name.toLowerCase().includes('total')) {
            console.log(`key: '${item.category_name}'`);
        }
    });
}

inspectSnapshot();
