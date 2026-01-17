'use server';

import { createClient } from '@supabase/supabase-js';

// We use the Service Role Key here to bypass RLS.
// This is critical because "Norms" are calculated from ALL users' data,
// but RLS typically prevents one user (even admin) from seeing other users' raw test results
// unless an explicit policy exists.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function fetchTestResultsForNorms(targetTestId: string, sourceTestId: string, startDate: string, endDate: string) {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment details missing for Service Role');
    }

    // [Security Fix] Authenticate User & Verify Role
    // Since this action uses Service Role (Bypass RLS), we MUST verify the caller is an Admin.
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const authClient = await createServerSupabaseClient();
    const { data: { session } } = await authClient.auth.getSession();

    if (!session) {
        throw new Error('Unauthorized: No active session');
    }

    // Check Role
    const { data: userRole } = await (authClient
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single() as any);

    if (!userRole || (userRole.role !== 'SUPER_ADMIN' && userRole.role !== 'ADMIN')) {
        throw new Error('Forbidden: Insufficient permissions');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 0. [Auto-detect Source] Smart Fallback Logic
        // If sourceTestId is same as targetTestId (default), check if we have enough data.
        // If not, try to find a "Reference" test (e.g., Standard Personality Test).
        let finalSourceTestId = sourceTestId;

        if (targetTestId === sourceTestId) {
            // Count results for this test first
            const { count: currentCount } = await supabase
                .from('test_results')
                .select('*', { count: 'exact', head: true })
                .eq('test_id', targetTestId)
                .eq('attempt_number', 1);

            console.log(`[Smart Fallback] Target: ${targetTestId}, Count: ${currentCount}`);

            // If data is insufficient (e.g. < 30), look for Standard Test
            if ((currentCount || 0) < 30) {
                const { data: standardTests } = await supabase
                    .from('tests')
                    .select('id')
                    .ilike('title', '%Standard%Personality%') // Search for Standard Personality Test
                    .limit(1);

                if (standardTests && standardTests.length > 0) {
                    console.log(`[Smart Fallback] Switching Source to Standard Test: ${standardTests[0].id}`);
                    finalSourceTestId = standardTests[0].id;
                } else {
                    console.log(`[Smart Fallback] No Standard Test found. Staying with Target.`);
                }
            }
        } else {
            console.log(`[Smart Fallback] Explicit Source Provided: ${sourceTestId}`);
        }

        // 1. [Target Metadata] Fetch Questions & Scales for TARGET Test
        // We need to know which questions belong to the target test and their categories (scales)
        const { data: targetQuestions, error: qError } = await supabase
            .from('test_questions')
            .select(`
                question_id,
                order_index,
                questions (
                    id,
                    content,
                    category,
                    is_reverse_scored
                )
            `)
            .eq('test_id', targetTestId);

        if (qError) throw new Error(`Target Questions Error: ${qError.message}`);

        // Map for quick lookup: QuestionID -> { category, isReversed }
        const questionMap = new Map<string, { category: string, isReversed: boolean }>();
        const targetQuestionIds = new Set<string>();

        (targetQuestions || []).forEach((tq: any) => {
            if (tq.questions) {
                questionMap.set(tq.questions.id, {
                    category: tq.questions.category,
                    isReversed: tq.questions.is_reverse_scored || false
                });
                targetQuestionIds.add(tq.questions.id);
            }
        });

        const totalTargetQuestions = targetQuestionIds.size;

        // [Logic Update] If Source != Target, check mapping
        // Prepare ID Mapper (Target ID -> Source ID)
        // Default: Target ID maps to itself (assume self-mapping initially)
        const targetToSourceIdMap = new Map<string, string>();
        targetQuestionIds.forEach(id => targetToSourceIdMap.set(id, id));

        if (finalSourceTestId !== targetTestId) {
            console.log("[Norms Calc] Different Source Test detected. Mapping questions by text...");

            // Fetch Source Questions for text matching
            const { data: sourceQuestions, error: sqError } = await supabase
                .from('test_questions')
                .select(`
                    question_id,
                    questions ( id, content )
                `)
                .eq('test_id', finalSourceTestId);

            if (sqError) throw new Error(`Source Questions Error: ${sqError.message}`);

            // Build Text -> SourceID Map
            const sourceTextMap = new Map<string, string>();
            (sourceQuestions || []).forEach((sq: any) => {
                if (sq.questions?.content) {
                    // Normalize: remove spaces, lowercase
                    const normalized = sq.questions.content.trim().replace(/\s+/g, '').toLowerCase();
                    sourceTextMap.set(normalized, sq.questions.id);
                }
            });

            // Update Mapping based on text match
            let mappedCount = 0;
            (targetQuestions || []).forEach((tq: any) => {
                if (tq.questions?.content) {
                    const normalized = tq.questions.content.trim().replace(/\s+/g, '').toLowerCase();
                    const sourceId = sourceTextMap.get(normalized);
                    if (sourceId) {
                        targetToSourceIdMap.set(tq.questions.id, sourceId);
                        mappedCount++;
                    } else {
                        // console.warn(`Mapping failed for: ${tq.questions.content}`);
                    }
                }
            });
            console.log(`[Norms Calc] Mapped ${mappedCount} / ${totalTargetQuestions} questions.`);
        }

        // 2. [Target Metadata] Fetch Competencies for TARGET Test
        // We need to calculate competency scores based on scales
        const { data: targetCompetencies, error: cError } = await supabase
            .from('competencies')
            .select(`
                name,
                competency_scales ( scale_name )
            `)
            .eq('test_id', targetTestId);

        if (cError) throw new Error(`Target Competencies Error: ${cError.message}`);

        // 3. [Source Data] Fetch Results from SOURCE Test
        const { data: sourceResults, error: rError } = await supabase
            .from('test_results')
            .select('id, answers_log, user_id')
            .eq('test_id', finalSourceTestId) // Use finalSourceTestId
            .eq('attempt_number', 1)
            .gte('completed_at', startDate + 'T00:00:00Z')
            .lte('completed_at', endDate + 'T23:59:59Z');

        if (rError) throw new Error(`Source Results Error: ${rError.message}`);

        // 4. [Core Logic] Filter & Re-score
        // We only include results that have answers for ALL target questions.
        const validData: any[] = [];

        (sourceResults || []).forEach((row: any) => {
            const answers = row.answers_log || {};

            // Check completeness using MAPPED IDs
            let isComplete = true;
            for (const targetQId of targetQuestionIds) {
                const sourceQId = targetToSourceIdMap.get(targetQId);
                // If not mapped (undefined) or no answer in source, invalid.
                if (!sourceQId || answers[sourceQId] === undefined || answers[sourceQId] === null) {
                    isComplete = false;
                    break;
                }
            }
            if (!isComplete) return;

            // Re-score based on Target Metadata
            const scaleScores: Record<string, number> = {};

            // Calculate Scale Scores (Raw)
            questionMap.forEach((meta, targetQId) => {
                const sourceQId = targetToSourceIdMap.get(targetQId);
                // We checked existence above, but sourceQId could be undefined if mapping failed.
                if (!sourceQId) return;

                let val = Number(answers[sourceQId]);
                // Reverse Scoring
                if (meta.isReversed) {
                    val = 6 - val;
                }

                scaleScores[meta.category] = (scaleScores[meta.category] || 0) + val;
            });

            // Calculate Competency Scores (Raw Sum of specific scales)
            const competencyScores: Record<string, number> = {};
            let totalScore = 0;

            (targetCompetencies || []).forEach((comp: any) => {
                let compSum = 0;
                comp.competency_scales.forEach((cs: any) => {
                    compSum += (scaleScores[cs.scale_name] || 0);
                });
                competencyScores[comp.name] = compSum;
                totalScore += compSum; // This might duplicate if scales are shared, but typically total is separate or sum of comps
            });

            // For Total Score, usually it's just sum of all scales or average T-score. 
            // Here we just prepare 'detailed_scores' structure.
            // But Norm Calculation Stage (next step in UI) expects 'detailed_scores' to have Scale/Comp structures.
            // Actually, the UI calculates Norms based on THESE raw scores.

            // Construct simulated detailed_scores
            // The existing UI logic (handleCalculate) expects:
            // detailed_scores: { 
            //    [scale_name]: { raw: X, t_score: Y ... }, 
            //    [comp_name]: { raw: X ... } 
            // }
            // But 'fetchTestResultsForNorms' is basically providing the RAW data pool.
            // The UI will do the Mean/StdDev calc.
            // So we just need to pass the RAW scores in a way the UI understands?
            // Wait, the UI uses `row.detailed_scores[s.name].raw`.
            // So we must Construct this object.

            const simulatedDetailedScores: Record<string, any> = {
                scales: {},
                competencies: {}
            };

            // Fill Scales
            for (const [scale, score] of Object.entries(scaleScores)) {
                simulatedDetailedScores.scales[scale] = { raw: score };
            }
            // Fill Competencies
            for (const [comp, score] of Object.entries(competencyScores)) {
                simulatedDetailedScores.competencies[comp] = { raw: score };
            }
            // Fill Total (Global Raw)
            // Just sum of all scales for safety? Or leave it to specific logic.
            // Norm calc usually iterates Scales/Competencies defined in UI.

            validData.push({
                ...row,
                detailed_scores: simulatedDetailedScores
            });
        });

        console.log(`[Norms Calc] Target: ${targetTestId} (Q:${totalTargetQuestions}), Source: ${finalSourceTestId}, Fetched: ${sourceResults?.length}, Valid: ${validData.length}`);

        return {
            data: validData,
            count: validData.length,
            meta: {
                competencies: targetCompetencies
            }
        };
    } catch (e: any) {
        console.error('Server Action Error:', e);
        return { error: e.message };
    }
}

export async function fetchTestsAction() {
    console.log("--> fetchTestsAction called");
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Env Vars:", { url: !!supabaseUrl, key: !!supabaseServiceKey });
        throw new Error('Supabase environment details missing for Service Role');
    }

    // [Security Fix] Authenticate User & Verify Role
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    const authClient = await createServerSupabaseClient();
    const { data: { session } } = await authClient.auth.getSession();

    if (!session) {
        throw new Error('Unauthorized: No active session');
    }

    const { data: userRole } = await (authClient
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single() as any);

    if (!userRole || (userRole.role !== 'SUPER_ADMIN' && userRole.role !== 'ADMIN')) {
        throw new Error('Forbidden: Insufficient permissions');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data, error } = await supabase
            .from('tests')
            .select('*')
            .eq('type', 'PERSONALITY')
            .neq('id', '8afa34fb-6300-4c5e-bc48-bbdb74c717d8') // Hide Global Placeholder
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch Tests Error:', error);
            throw new Error(error.message);
        }
        console.log("--> fetchTestsAction details", data?.length, data);

        return { data };
    } catch (e: any) {
        console.error('Server Action Error:', e);
        return { error: e.message };
    }
}
