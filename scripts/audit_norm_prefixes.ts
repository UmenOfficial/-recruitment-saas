
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function auditNormPrefixes() {
    console.log('--- Norm Prefix Audit ---\n');

    // Fetch all norms with test info
    // Note: Supabase join syntax might differ, doing two queries for simplicity or using join if relation exists.
    // 'test_norms' usually links to 'tests'.

    const { data: norms, error } = await supabase
        .from('test_norms')
        .select(`
            id,
            category_name,
            test_id,
            tests (title)
        `)
        .order('test_id');

    if (error) {
        console.error('Error fetching norms:', error);
        return;
    }

    const invalidNorms = norms.filter((n: any) => {
        const name = n.category_name;
        if (name === 'TOTAL' || name === 'Total') return false;
        if (name.startsWith('Scale_')) return false;
        if (name.startsWith('Comp_')) return false;
        return true;
    });

    console.log(`Found ${invalidNorms.length} norms without valid prefixes (Scale_, Comp_).\n`);

    if (invalidNorms.length === 0) {
        console.log('All norms are valid.');
        return;
    }

    // Group by Test
    const grouped: Record<string, any[]> = {};
    invalidNorms.forEach((n: any) => {
        const testTitle = n.tests?.title || 'Unknown Test';
        if (!grouped[testTitle]) grouped[testTitle] = [];
        grouped[testTitle].push(n.category_name);
    });

    Object.entries(grouped).forEach(([title, names]) => {
        console.log(`[Test: ${title}]`);
        names.forEach(name => console.log(`  - ${name}`));
        console.log('');
    });
}

auditNormPrefixes();
