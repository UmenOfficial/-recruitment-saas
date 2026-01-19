import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('mock')) {
  console.log('Error: 실제 데이터베이스 연결 정보가 없습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserAndResults(email: string) {
  console.log(`Checking data for user: ${email}...`);

  // 1. Get User ID (Check Public & Auth)
  let userId = null;

  // Try finding in public.users first
  let { data: publicUser, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();

  if (publicUser) {
    console.log('[OK] User found in public.users:', publicUser);
    userId = publicUser.id;
  } else {
    console.log('[WARN] User not found in public.users.');
  }

  // Check Auth Users
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
      console.error('Auth API Error:', authError.message);
      return;
  }
  const found = authUser.users.find(u => u.email === email);
  if (found) {
    console.log('[OK] User found in Auth system:', found.id);
    if (userId && userId !== found.id) {
        console.error('[CRITICAL] public.users ID and Auth ID do not match!');
    }
    userId = found.id;
  } else {
      console.error('[CRITICAL] User not found in Auth system.');
      return;
  }

  // 2. Check Test Results with all columns
  console.log(`\nFetching test results for user_id: ${userId}`);

  const { data: results, error: resultError } = await supabase
    .from('test_results')
    .select(`
        id,
        total_score,
        completed_at,
        created_at,
        status,
        test_id,
        tests ( id, title )
    `)
    .eq('user_id', userId);

  if (resultError) {
    console.error('Error fetching test results:', resultError.message);
    return;
  }

  if (!results || results.length === 0) {
    console.log('No test results found for this user.');
  } else {
    console.log(`Found ${results.length} test result(s):`);
    results.forEach((r, idx) => {
        console.log(`\n[Result ${idx + 1}]`);
        console.log(`- ID: ${r.id}`);
        console.log(`- Test: ${r.tests?.title} (${r.test_id})`);
        console.log(`- Score: ${r.total_score}`);
        console.log(`- Created At: ${r.created_at}`);
        console.log(`- Completed At: ${r.completed_at}`); // Check if this is NULL
        console.log(`- Status: ${r.status}`); // Check if this is NULL or other value
    });
  }
}

checkUserAndResults('paycmh@gmail.com');
