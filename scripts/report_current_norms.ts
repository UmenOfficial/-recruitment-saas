
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function reportCurrentNorms() {
    console.log('--- Current Database Norms Report ---\n');

    // 1. Fetch Tests
    const { data: tests } = await supabase
        .from('tests')
        .select('id, title')
        .ilike('title', '%NIS%') // Filter for NIS tests relevant to recent context
        .order('created_at', { ascending: false });

    if (!tests || tests.length === 0) {
        console.log('No NIS tests found.');
        return;
    }

    // 2. Iterate and Report
    for (const test of tests) {
        console.log(`\n### Test: ${test.title} (ID: ${test.id})`);

        const { data: norms } = await supabase
            .from('test_norms')
            .select('*')
            .eq('test_id', test.id)
            .order('category_name');

        if (!norms || norms.length === 0) {
            console.log('  (No norms found)');
            continue;
        }

        const competencies: any[] = [];
        const scales: any[] = [];
        const total: any[] = [];
        const others: any[] = [];

        norms.forEach((n: any) => {
            const name = n.category_name;
            if (name === 'TOTAL' || name === 'Total') {
                total.push(n);
            } else if (name.startsWith('Comp_')) {
                competencies.push(n);
            } else if (name.startsWith('Scale_')) {
                scales.push(n);
            } else {
                others.push(n);
            }
        });

        // Report Total
        if (total.length > 0) {
            console.log('\n  **[TOTAL]**');
            total.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
        }

        // Report Competencies
        if (competencies.length > 0) {
            console.log(`\n  **[Competencies]** (${competencies.length})`);
            competencies.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
        }

        // Report Scales
        if (scales.length > 0) {
            console.log(`\n  **[Scales]** (${scales.length})`);
            scales.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
        }

        // Report Others (Should be empty if fix worked)
        if (others.length > 0) {
            console.log(`\n  **[⚠️ Unclassified / No Prefix]** (${others.length})`);
            others.forEach(n => console.log(`    - ${n.category_name}: Mean=${n.mean_value}, SD=${n.std_dev_value}`));
        }
    }
}

reportCurrentNorms();
