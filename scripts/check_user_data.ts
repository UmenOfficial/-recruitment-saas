import { createClient } from '@supabase/supabase-js';

// 환경 변수 확인
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes('mock')) {
  console.log('Error: 실제 데이터베이스 연결 정보가 없습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserData(email: string) {
  console.log(`Checking data for user: ${email}...`);

  // 1. Get User ID
  let { data: user, error } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', email)
    .single();

  if (error || !user) {
    console.log('User not found in public.users. Checking auth.users via admin API...');
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth API Error:', authError.message);
        return;
    }
    const found = authUser.users.find(u => u.email === email);
    if (!found) {
        console.log('User not found in Auth system either.');
        return;
    }
    user = { id: found.id, email: found.email, name: 'Auth User' };
    console.log('User found in Auth system:', user);
  } else {
    console.log('User found in public.users:', user);
  }

  // 2. Check Test Results
  const { data: results, error: resultError } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', user.id);

  if (resultError) {
    console.error('Error fetching test results:', resultError.message);
    return;
  }

  if (!results || results.length === 0) {
    console.log('No test results found for this user.');
  } else {
    console.log(`Found ${results.length} test result(s):`);
    results.forEach((r, idx) => {
      console.log(`${idx + 1}. Test ID: ${r.test_id}, Score: ${r.total_score}, Date: ${r.created_at}, Status: ${r.status}`);
    });
  }
}

checkUserData('paycmh@gmail.com');
