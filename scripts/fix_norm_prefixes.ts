
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fixNormPrefixes() {
    console.log('--- Fixing Norm Prefixes ---\n');

    // 1. Fetch target norms
    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('id, category_name');

    if (error) {
        console.error('Error fetching norms:', error);
        return;
    }

    const targets = norms.filter((n: any) => {
        const name = n.category_name;
        if (name === 'TOTAL' || name === 'Total') return false;
        if (name.startsWith('Scale_')) return false;
        if (name.startsWith('Comp_')) return false;
        return true;
    });

    console.log(`Found ${targets.length} norms to update.`);

    // 2. Update one by one (safe approach)
    for (const norm of targets) {
        const newName = `Scale_${norm.category_name}`;
        console.log(`Updating ID ${norm.id}: "${norm.category_name}" -> "${newName}"`);

        const { error: updateError } = await supabase
            .from('test_norms')
            .update({ category_name: newName })
            .eq('id', norm.id);

        if (updateError) {
            console.error(`Failed to update ID ${norm.id}:`, updateError.message);
        }
    }

    console.log('\nUpdate Complete.');
}

fixNormPrefixes();
