
import { createClient } from '@supabase/supabase-js';
import { calculatePersonalityScores, ScoringCompetency, ScoringNorm, ScoringQuestion } from '../lib/scoring';
import { generateDeepDiveReport } from '../lib/reports/personality-report';

// Check for required environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing environment variables.');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('--- Starting Deep Dive Report Recalculation ---');

  // 1. Fetch Metadata
  console.log('Fetching metadata...');

  // A. Questions (to map ID -> Category)
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, category, score') as { data: any[], error: any };

  if (qError) throw qError;
  const scoringQuestions: ScoringQuestion[] = questions.map((q: any) => ({
    id: q.id,
    category: q.category
  }));

  // Identify all Scale categories
  const distinctScales = Array.from(new Set(questions.map((q: any) => q.category).filter(Boolean)));
  console.log(`Found ${distinctScales.length} distinct scales.`);

  // B. Competencies and Scales Mapping
  const { data: compsData, error: cError } = await supabase
    .from('competencies')
    .select('id, test_id, name');
  if (cError) throw cError;

  const { data: compScalesData, error: csError } = await supabase
    .from('competency_scales')
    .select('competency_id, scale_name');
  if (csError) throw csError;

  // C. Test Norms
  const { data: allNorms, error: nError } = await supabase
    .from('test_norms')
    .select('*');
  if (nError) throw nError;

  // D. Tests (to find NIS/Common source)
  const { data: tests, error: tError } = await supabase.from('tests').select('id, title');
  if (tError) throw tError;

  // 2. Identify Common Scale Norms Source
  // We prioritize a test with 'NIS' in the title. If not found, we check for an environment variable.
  // Finally, we fallback to the first test, but warn heavily.
  let commonNormSourceId: string | undefined;

  const nisTest = tests.find((t: any) => t.title.toUpperCase().includes('NIS'));
  if (nisTest) {
    commonNormSourceId = nisTest.id;
    console.log(`Using Common Scale Norms from 'NIS' Test ID: ${commonNormSourceId} (${nisTest.title})`);
  } else if (process.env.COMMON_NORM_TEST_ID) {
    commonNormSourceId = process.env.COMMON_NORM_TEST_ID;
    const fallbackTest = tests.find((t: any) => t.id === commonNormSourceId);
    console.log(`Using Common Scale Norms from ENV Test ID: ${commonNormSourceId} (${fallbackTest?.title || 'Unknown'})`);
  } else {
    commonNormSourceId = tests[0]?.id;
    console.warn(`WARNING: Could not find 'NIS' test and COMMON_NORM_TEST_ID is not set.`);
    console.warn(`Falling back to first available test ID: ${commonNormSourceId} (${tests[0]?.title || 'Unknown'})`);
    console.warn(`This may result in incorrect norms if the first test is not the standard reference.`);
  }

  const commonScaleNorms: ScoringNorm[] = allNorms
    .filter((n: any) => n.test_id === commonNormSourceId && distinctScales.includes(n.category_name))
    .map((n: any) => ({
      category_name: n.category_name,
      mean_value: n.mean_value,
      std_dev_value: n.std_dev_value
    }));

  console.log(`Loaded ${commonScaleNorms.length} Common Scale Norms.`);

  // 3. Fetch Completed Test Results
  console.log('Fetching completed test results...');
  const { data: results, error: rError } = await supabase
    .from('test_results')
    .select('*')
    .not('completed_at', 'is', null);

  if (rError) throw rError;
  console.log(`Found ${results.length} completed tests.`);

  // 4. Processing Loop
  let successCount = 0;
  let failCount = 0;

  for (const res of results) {
    try {
      if (!res.test_id) {
        console.warn(`Skipping result ${res.id}: No test_id linked.`);
        continue;
      }

      // A. Prepare Competency Norms (Per Test)
      // Filter norms for this test_id that are NOT scales (or check against competency names)
      // We'll find norms matching the competency names for this test.
      const testCompetencies = compsData.filter((c: any) => c.test_id === res.test_id);
      const testCompetencyNames = testCompetencies.map((c: any) => c.name);
      testCompetencyNames.push('TOTAL'); // Ensure TOTAL is looked up here

      const localCompetencyNorms: ScoringNorm[] = allNorms
        .filter((n: any) => n.test_id === res.test_id && testCompetencyNames.includes(n.category_name))
        .map((n: any) => ({
          category_name: n.category_name,
          mean_value: n.mean_value,
          std_dev_value: n.std_dev_value
        }));

      // B. Prepare Competency Config (ScoringCompetency[])
      const scoringCompetencies: ScoringCompetency[] = testCompetencies.map((c: any) => {
        const scales = compScalesData
          .filter((cs: any) => cs.competency_id === c.id)
          .map((cs: any) => ({ scale_name: cs.scale_name }));

        return {
          name: c.name,
          competency_scales: scales
        };
      });

      // C. Parse Answers
      // answers_log is Json. Assuming it's Record<string, string|number>
      const answers = res.answers_log as Record<string, string | number>;
      if (!answers) {
        console.warn(`Skipping result ${res.id}: No answers_log.`);
        continue;
      }

      // D. Calculate Scores
      const detailedScores = calculatePersonalityScores(
        answers,
        scoringQuestions,
        commonScaleNorms,
        localCompetencyNorms,
        scoringCompetencies
      );

      // E. Generate Report
      const report = generateDeepDiveReport(detailedScores, scoringCompetencies);

      // F. Save Report
      const { error: upsertError } = await supabase
        .from('personality_test_reports')
        .upsert({
          test_result_id: res.id,
          report: report as any, // Cast to any because Json type mismatch in strict mode
          updated_at: new Date().toISOString()
        }, { onConflict: 'test_result_id' });

      if (upsertError) {
        console.error(`Error saving report for ${res.id}:`, upsertError.message);
        failCount++;
      } else {
        successCount++;
        // console.log(`Processed ${res.id}`);
      }

    } catch (err: any) {
      console.error(`Error processing result ${res.id}:`, err.message);
      failCount++;
    }
  }

  console.log('--- Processing Complete ---');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
