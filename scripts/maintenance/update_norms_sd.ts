
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DRY_RUN = false; // Set to false to apply changes

async function updateNorms() {
    console.log("Searching for test 'NIS 25.12.28.'...");

    // 1. Find Test
    // User said "NIS 25.12.28.". We'll search fuzzily.
    const { data: tests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS%');

    // Simple heuristic to find best match if multiple
    const targetTest = tests?.find(t => t.title.includes('25.12.28') || t.title.includes('2025.12.28'))
        || tests?.[0]; // Fallback to first if only one NIS test exists which is likely

    if (!targetTest) {
        console.error("Test not found.");
        return;
    }
    console.log(`Target Test: ${targetTest.title} (${targetTest.id})`);

    // 2. Fetch Norms
    const { data: norms } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', targetTest.id);

    if (!norms || norms.length === 0) {
        console.log("No norms found.");
        return;
    }

    // 3. Filter
    const EXCLUDED_KEYWORDS = ['거짓말', '지시불이행', '자기신뢰도검증'];
    const EXCLUDED_PREFIXES = ['Comp_', 'COMP_', 'Total', 'TOTAL']; // 'Total' usually implies Comp_Total or pure TOTAL category

    const updates: any[] = [];

    norms.forEach(n => {
        const name = n.category_name;

        // Exclude Competencies and Total
        if (name.startsWith('Comp_') || name.toUpperCase() === 'TOTAL' || name.startsWith('COMP_')) return;

        // Exclude Specific Scales
        // Check if name contains any excluded keyword (handling both 'Scale_거짓말' and '거짓말')
        if (EXCLUDED_KEYWORDS.some(k => name.includes(k))) return;

        // Valid candidate
        const oldSd = n.std_dev_value;
        const newSd = Math.max(0.1, oldSd - 1.0); // Safety floor

        if (Math.abs(oldSd - newSd) < 0.001) {
            // Change is negligible (was already <= 1.1 potentially clapped to 0.1? No, if 0.8 -> 0.1. 1.8 -> 0.8)
            // If oldSd was 0.5, new is 0.1. Diff 0.4.
            return;
        }

        updates.push({
            test_id: targetTest.id,
            category_name: name,
            std_dev_value: parseFloat(newSd.toFixed(5)),
            _old: oldSd
        });
    });

    console.log(`\nIdentified ${updates.length} norms to update (subtracting 1.0 from SD):`);

    // Log preview
    updates.forEach(u => {
        console.log(` - [${u.category_name}] SD: ${u._old} -> ${u.std_dev_value}`);
    });

    if (DRY_RUN) {
        console.log("\n[DRY RUN] No changes made.");
        return;
    }

    // 4. Update
    console.log("\nApplying updates...");
    for (const u of updates) {
        const { _old, ...payload } = u;
        const { error } = await supabase
            .from('test_norms')
            .update({ std_dev_value: payload.std_dev_value })
            .eq('test_id', payload.test_id)
            .eq('category_name', payload.category_name);

        if (error) console.error(`Failed to update ${payload.category_name}:`, error.message);
    }
    console.log("Update complete.");
}

updateNorms();
