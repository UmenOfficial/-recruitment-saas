import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Get user's applications
  const { data: apps } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('user_id', user.id);

  if (!apps || apps.length === 0) {
    return NextResponse.json({ message: 'No applications found' });
  }

  const appIds = apps.map(app => app.id);

  // 2. Find test_results linked to these apps
  const { data: allResults, error } = await supabaseAdmin
    .from('test_results')
    .select('id, user_id, application_id')
    .in('application_id', appIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!allResults || allResults.length === 0) {
    return NextResponse.json({ message: 'No test results found for this user' });
  }

  // 3. Filter results that need fixing (user_id is null or mismatch)
  const toFix = allResults.filter(r => r.user_id !== user.id);

  if (toFix.length === 0) {
    return NextResponse.json({ message: 'All test results are correctly linked', count: allResults.length });
  }

  // 4. Fix them
  const updates = toFix.map(r =>
    supabaseAdmin
      .from('test_results')
      .update({ user_id: user.id })
      .eq('id', r.id)
      .then(({ error }) => ({ id: r.id, error }))
  );

  const results = await Promise.all(updates);
  const failures = results.filter(r => r.error);

  if (failures.length > 0) {
    return NextResponse.json({
      message: `Attempted to fix ${toFix.length} results. Some failed.`,
      failures
    }, { status: 500 });
  }

  return NextResponse.json({
    message: `Successfully fixed ${toFix.length} test results`,
    fixedIds: toFix.map(r => r.id)
  });
}
