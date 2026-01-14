
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNisNorms() {
    console.log("Searching for 'NIS Customizing Test'...");

    // 1. Find Test ID
    const { data: tests, error: testError } = await supabase
        .from('tests')
        .select('id, title, type')
        .ilike('title', '%NIS Customizing Test%');

    if (testError) {
        console.error("Error fetching tests:", testError);
        return;
    }

    if (!tests || tests.length === 0) {
        console.log("No test found with title matching 'NIS Customizing Test'");
        return;
    }

    const nisTest = tests[0];
    console.log(`Found Test: ${nisTest.title} (ID: ${nisTest.id}, Type: ${nisTest.type})`);

    // 2. Check Norms
    console.log(`Checking norms for Test ID: ${nisTest.id}...`);
    const { data: norms, error: normsError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', nisTest.id);

    if (normsError) {
        console.error("Error fetching norms:", normsError);
        return;
    }

    // 3. Fetch Competencies to compare
    console.log("Fetching Competencies...");
    const { data: comps, error: compError } = await supabase
        .from('competencies')
        .select('name')
        .eq('test_id', nisTest.id);

    if (compError) console.error(compError);

    console.log("\n--- Analysis Report ---");

    const normCategories = new Set(norms.map(n => n.category_name));
    const compNames = comps?.map(c => c.name) || [];

    console.log(`Total Norms: ${norms.length}`);
    console.log(`Total Competencies: ${compNames.length}`);

    // Check Scales (Expected: Start with Scale_)
    const scaleNorms = norms.filter(n => n.category_name.startsWith('Scale_'));
    console.log(`Norms with 'Scale_' prefix: ${scaleNorms.length}`);

    // Check Comps (Expected: Match comp names, with or without Comp_ prefix)
    const compNormsPrefix = norms.filter(n => n.category_name.startsWith('Comp_'));
    const compNormsNoPrefix = norms.filter(n => !n.category_name.startsWith('Scale_') && !n.category_name.startsWith('Comp_') && n.category_name !== 'TOTAL');

    console.log(`Norms with 'Comp_' prefix: ${compNormsPrefix.length}`);
    console.log(`Norms WITHOUT prefix (Potential Comps): ${compNormsNoPrefix.length}`);
    console.log(`Sample No-Prefix Norms: ${compNormsNoPrefix.slice(0, 5).map(n => n.category_name).join(', ')}`);

    // Check TOTAL
    const totalNorm = norms.find(n => n.category_name === 'TOTAL' || n.category_name === 'Comp_TOTAL');
    console.log(`\n'TOTAL' Norm Exists: ${!!totalNorm} (Name: ${totalNorm?.category_name})`);
    if (totalNorm) {
        console.log(`TOTAL Mean: ${totalNorm.mean_value}, SD: ${totalNorm.std_dev_value}`);
    }

    // Validation
    const missingComps = compNames.filter(name => !normCategories.has(name) && !normCategories.has(`Comp_${name}`));
    if (missingComps.length > 0) {
        console.log(`\n[WARNING] Missing Norms for Competencies: ${missingComps.join(', ')}`);
    } else {
        console.log(`\n[OK] All Competencies have corresponding norms.`);
    }
}

checkNisNorms();
