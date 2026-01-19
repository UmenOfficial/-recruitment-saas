
import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugLive() {
  console.log('Fetching 5 most recent test_results globally (Service Role)...');

  // 1. Fetch recent results
  const { data: results, error } = await supabase
    .from('test_results')
    .select(`
        id,
        user_id,
        test_id,
        completed_at,
        created_at,
        status,
        users ( email ),
        tests ( id, title )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
      console.error('Error:', error);
      return;
  }

  console.log('Recent Results:');
  results.forEach(r => {
      console.log('--------------------------------------------------');
      console.log(`Result ID: ${r.id}`);
      console.log(`User: ${r.user_id} (${r.users?.email || 'No User Join'})`);
      console.log(`Test: ${r.test_id} (${r.tests?.title || 'No Test Join'})`);
      console.log(`Created: ${r.created_at}`);
      console.log(`Completed: ${r.completed_at}`);
      console.log(`Status: ${r.status}`);

      if (!r.tests) {
          console.warn('⚠️ WARNING: This result has no linked Test data! It will likely cause dashboard issues.');
      }
      if (!r.users) {
          console.warn('⚠️ WARNING: This result has no linked User data!');
      }
  });

  // 2. Specific check for paycmh
  console.log('\nChecking specific user (paycmh@gmail.com) via Auth List...');
  const { data: authUser } = await supabase.auth.admin.listUsers();
  const targetUser = authUser.users.find(u => u.email === 'paycmh@gmail.com');

  if (targetUser) {
      console.log(`Target Auth ID: ${targetUser.id}`);
      const userResults = results.filter(r => r.user_id === targetUser.id);
      if (userResults.length > 0) {
          console.log(`Found ${userResults.length} matches in recent list.`);
      } else {
          console.log('No matches in top 5 recent results. Fetching specifically for this ID...');
          const { data: specificResults } = await supabase
            .from('test_results')
            .select('*')
            .eq('user_id', targetUser.id);
          console.log(`Specific fetch found ${specificResults?.length} records.`);
      }
  }
}

debugLive();
