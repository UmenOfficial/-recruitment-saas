
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const GLOBAL_TEST_ID = '8afa34fb-6300-4c5e-bc48-bbdb74c717d8';
const SPECIFIC_TEST_ID = 'a724bab1-b7e2-4b99-a5a3-8ae47cd9411e'; // Standard Personality Test

async function main() {
  console.log('Checking Norm Distribution...');

  // 1. Check Global Norms
  const { data: globalNorms } = await supabase
    .from('test_norms')
    .select('*')
    .eq('test_id', GLOBAL_TEST_ID);

  const globalScales = globalNorms?.filter(n => n.category_name.startsWith('Scale_')).length || 0;
  const globalComps = globalNorms?.filter(n => !n.category_name.startsWith('Scale_')).length || 0;

  console.log(`\nGlobal ID (${GLOBAL_TEST_ID}):`);
  console.log(`- Total Norms: ${globalNorms?.length}`);
  console.log(`- Scale Norms: ${globalScales}`);
  console.log(`- Comp/Other Norms: ${globalComps}`);
  if (globalComps > 0) {
    console.log('  WARNING: Global contains non-Scale norms:', globalNorms?.filter(n => !n.category_name.startsWith('Scale_')).map(n => n.category_name));
  } else {
    console.log('\n--- Sample Global Scale Norms (First 5) ---');
    globalNorms?.filter(n => n.category_name.startsWith('Scale_')).slice(0, 5).forEach(n => {
      console.log(`- ${n.category_name.replace('Scale_', '')}: Mean=${n.mean_value}, StdDev=${n.std_dev_value}`);
    });
  }

  // 2. Check Specific Test Norms
  const { data: localNorms } = await supabase
    .from('test_norms')
    .select('category_name')
    .eq('test_id', SPECIFIC_TEST_ID);

  const localScales = localNorms?.filter(n => n.category_name.startsWith('Scale_')).length || 0;
  const localComps = localNorms?.filter(n => !n.category_name.startsWith('Scale_')).length || 0;

  console.log(`\nSpecific ID (${SPECIFIC_TEST_ID}):`);
  console.log(`- Total Norms: ${localNorms?.length}`);
  console.log(`- Scale Norms: ${localScales}`);
  console.log(`- Comp/Other Norms: ${localComps}`);

  if (localScales > 0) {
    console.log('  WARNING: Local contains Scale norms (Duplicates?):', localNorms?.filter(n => n.category_name.startsWith('Scale_')).map(n => n.category_name));
  }
}

main();
