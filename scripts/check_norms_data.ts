
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNorms() {
  console.log("Checking Norms for NIS Customizing Test...");

  // 1. Find the NIS test ID
  const { data: tests, error: testError } = await supabase
    .from('tests')
    .select('id, title')
    .ilike('title', '%NIS Customizing%')
    .limit(1);

  if (testError || !tests || tests.length === 0) {
    console.error("Could not find NIS Customizing Test", testError);
    return;
  }

  const testId = tests[0].id;
  console.log(`Found Test: ${tests[0].title} (${testId})`);

  // 2. Fetch Norms
  const { data: norms, error: normError } = await supabase
    .from('test_norms')
    .select('*')
    .eq('test_id', testId);

  if (normError) {
    console.error("Error fetching norms", normError);
    return;
  }

  console.log(`\nTotal Norms Found: ${norms?.length}`);

  const scaleNorms = norms.filter(n => n.category_name.startsWith('Scale_'));
  const compNorms = norms.filter(n => n.category_name.startsWith('Comp_'));

  console.log(`Scale Norms: ${scaleNorms.length}`);
  console.log(`Competency Norms: ${compNorms.length}`);

  // 3. Display Sample
  console.log("\n--- Sample Scale Norms ---");
  scaleNorms.slice(0, 5).forEach(n => {
    console.log(`${n.category_name}: Mean=${n.mean_value.toFixed(2)}, StdDev=${n.std_dev_value.toFixed(2)}`);
  });

  console.log("\n--- All Competency Norms ---");
  compNorms.forEach(n => {
    console.log(`${n.category_name}: Mean=${n.mean_value.toFixed(2)}, StdDev=${n.std_dev_value.toFixed(2)}`);
  });
}

checkNorms();
