
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';
const STANDARD_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e';

async function createVersions() {
    console.log('--- Creating Standardized Norm Versions ---\n');

    // 1. Fetch Global Scales
    const { data: globalScales } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', GLOBAL_TEST_ID)
        .like('category_name', 'Scale_%');

    if (!globalScales || globalScales.length === 0) {
        console.error('Failed to fetch Global Scales.');
        return;
    }
    console.log(`Global Standards loaded: ${globalScales.length} scales.`);

    // 2. Find NIS Customizing Test
    const { data: nisTests } = await supabase.from('tests').select('id, title').ilike('title', '%NIS Customizing%').limit(1);
    const nisTest = nisTests?.[0];

    if (!nisTest) {
        console.error('NIS Test not found');
        return;
    }

    // --- Helper Function ---
    async function createVersionForTest(testId: string, testTitle: string, versionName: string) {
        console.log(`\nProcessing: ${testTitle} (${testId}) -> Version: ${versionName}`);

        // A. Get Local Competencies (Comp_*)
        const { data: localComps } = await supabase
            .from('test_norms')
            .select('*')
            .eq('test_id', testId)
            .or('category_name.like.Comp_%,category_name.eq.TOTAL');

        const comps = localComps || [];
        console.log(`  Local Competencies found: ${comps.length}`);

        // B. Merge (Global Scales + Local Comps)
        const mergedNorms = [
            ...globalScales.map(s => ({
                test_id: testId,
                category_name: s.category_name,
                mean_value: s.mean_value,
                std_dev_value: s.std_dev_value
            })),
            ...comps.map(c => ({
                test_id: testId,
                category_name: c.category_name,
                mean_value: c.mean_value,
                std_dev_value: c.std_dev_value
            }))
        ];

        console.log(`  Total Norms in Version: ${mergedNorms.length}`);

        // C. Save Version
        // Check if version name exists, if so update/overwrite or create new?
        // Let's create new.
        const { data: inserted, error } = await supabase
            .from('test_norm_versions')
            .insert({
                test_id: testId,
                version_name: versionName,
                active_norms_snapshot: mergedNorms,
                is_active: true // Auto-activate requested? Or just create? Requirement 2/3 says "can check in version management". User imply final result show. Assuming active is good.
            })
            .select()
            .maybeSingle();

        if (error) {
            console.error(`  Error creating version: ${error.message}`);
        } else {
            console.log(`  SUCCESS: Version '${versionName}' created (ID: ${inserted.id})`);

            // D. Deactivate others
            await supabase
                .from('test_norm_versions')
                .update({ is_active: false })
                .eq('test_id', testId)
                .neq('id', inserted.id);
            console.log('  Other versions deactivated.');
        }

        return mergedNorms;
    }

    // --- Execute for NIS ---
    const nisResult = await createVersionForTest(nisTest.id, nisTest.title, 'NIS_260122');

    // --- Execute for Standard ---
    const stdResult = await createVersionForTest(STANDARD_TEST_ID, 'Standard Personality Test', 'Standard_260122');

    return { nisResult, stdResult };
}

createVersions();
