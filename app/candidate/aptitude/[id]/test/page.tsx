import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import TestInterface from "./TestInterface";
import TestEntryGate from "./TestEntryGate";

export const dynamic = "force-dynamic";

export default async function AptitudeTestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Service Role Client for Admin operations (Bypass RLS)
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    // 1. Get User Info (Verify Auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. Get Test Info (Time Limit)
    const { data: test } = await supabaseAdmin
        .from('tests')
        .select('time_limit')
        .eq('id', id)
        .single();

    if (!test) return <div>Test not found</div>;

    // 3. Get or Create Application ID
    let application = null;

    // Check existing with Admin to ensure we see it if it exists
    const { data: existingApp } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (existingApp) {
        application = existingApp;
    } else {
        // Create a new application for testing flow (Using Admin)
        const { data: newApp, error: appError } = await supabaseAdmin
            .from('applications')
            .insert({
                user_id: user.id,
                status: 'TEST_PENDING',
                blind_mode_enabled: false,
                data_retention_days: 90,
                consent_given_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (appError || !newApp) {
            console.error("Failed to create application:", appError);
            return <div>Failed to initialize application</div>;
        }
        application = newApp;
    }

    // 4. Get or Create Test Result (Start Test)
    let { data: testResult } = await supabaseAdmin
        .from('test_results')
        .select('*')
        .eq('application_id', application.id)
        .eq('test_id', id)
        .single();

    if (!testResult) {
        // Start new test (Using Admin)
        const { data: newResult, error } = await supabaseAdmin
            .from('test_results')
            .insert({
                application_id: application.id,
                test_id: id,
                started_at: new Date().toISOString(),
                time_limit_minutes: test.time_limit,
                total_score: 0,
                answers_log: {},
                violation_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to start test:", error);
            // More detailed error logging
            return (
                <div>
                    <p>Error starting test</p>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            );
        }
        testResult = newResult;
    }

    // Check if already completed
    if (testResult.completed_at) {
        redirect('/candidate/dashboard');
    }

    // 5. Calculate Status
    const now = new Date().getTime();
    const start = new Date(testResult.started_at!).getTime();
    const limitMs = (test.time_limit || 60) * 60 * 1000;
    const elapsed = now - start;
    const isExpired = elapsed > limitMs;

    const answers = (testResult.answers_log as Record<string, number>) || {};
    const hasAnswers = Object.keys(answers).length > 0;

    // Check for interruption (if inactive for more than 1 minute)
    let status: 'EXPIRED' | 'INTERRUPTED' | 'VALID' = 'VALID';

    if (isExpired) {
        status = 'EXPIRED';
    } else if (hasAnswers) {
        // If updated_at is old (e.g. > 1 min ago), consider it an interruption
        const lastUpdate = testResult.updated_at ? new Date(testResult.updated_at).getTime() : start;
        const inactiveDuration = now - lastUpdate;

        // Threshold: 30 seconds to be safe (Refresh usually takes < 5s)
        if (inactiveDuration > 30 * 1000) {
            status = 'INTERRUPTED';
        }
    }

    // 6. Fetch Questions
    const { data: testQuestions, error: qError } = await supabase
        .from('test_questions')
        .select(`
            order_index,
            questions (
                id,
                content,
                options,
                image_url
            )
        `)
        .eq('test_id', id)
        .order('order_index');

    if (qError || !testQuestions) {
        console.error("Failed to fetch questions:", qError);
        return <div>Error loading questions</div>;
    }

    // Format questions
    const formattedQuestions = testQuestions.map(tq => ({
        id: tq.questions!.id,
        content: tq.questions!.content,
        options: tq.questions!.options,
        image_url: tq.questions!.image_url,
        order_index: tq.order_index
    }));

    return (
        <TestEntryGate status={status} testResultId={testResult.id}>
            <TestInterface
                testResultId={testResult.id}
                questions={formattedQuestions}
                initialAnswers={answers}
                timeLimitMinutes={test.time_limit || 60}
                startedAt={testResult.started_at!}
            />
        </TestEntryGate>
    );
}
