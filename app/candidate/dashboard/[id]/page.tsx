import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ReportContent from "@/components/report/ReportContent";

export const dynamic = 'force-dynamic';

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect("/login?next=/candidate/dashboard/" + id);

    const { data: result } = await supabase
        .from("test_results")
        .select(`
            id,
            total_score,
            completed_at,
            detailed_scores,
            answers_log,
            questions_order,
            test_id,
            user_id,
            tests ( id, title, type, description )
        `)
        .eq("id", id)
        .single();

    if (!result || result.user_id !== session.user.id) {
        return notFound();
    }

    // 1. Fetch competency metadata
    const { data: compMeta } = await supabase
        .from("competencies")
        .select(`
            id,
            name,
            description,
            competency_scales ( scale_name )
        `)
        .eq("test_id", result.test_id);

    // 2. Fetch questions and norms
    const [qRelationsResult, normsResult] = await Promise.all([
        supabase.from('test_questions').select('is_practice, questions(*)').eq('test_id', result.test_id),
        supabase.from('test_norms').select('*').eq('test_id', result.test_id)
    ]);

    const qRelations = qRelationsResult.data;
    const norms = normsResult.data || [];
    const normsMap = new Map(norms.map((n: any) => [n.category_name, n]));

    const questionsMap: Record<string, any> = {};
    const practiceIds = new Set<string>();

    qRelations?.forEach(r => {
        const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
        if (q) {
            questionsMap[q.id] = q;
            if (r.is_practice) practiceIds.add(q.id);
        }
    });

    const answers = (result.answers_log as Record<string, number>) || {};
    const qOrder = (result.questions_order as string[]) || [];

    // Filter out practice questions from qOrder to prevent skewing
    const validQOrder = qOrder.filter(qid => !practiceIds.has(qid));

    // 3. Trends
    const { data: allResults } = await supabase
        .from("test_results")
        .select(`
            id,
            total_score,
            completed_at,
            detailed_scores,
            attempt_number
        `)
        .eq("test_id", result.test_id)
        .eq("user_id", result.user_id)
        .order("attempt_number", { ascending: true });

    const attempts = allResults || [];
    const trendData = attempts.map((r, idx) => {
        const detailedTotal = (r.detailed_scores as any)?.total;
        let score = typeof detailedTotal === 'number' ? detailedTotal : detailedTotal?.t_score;

        if (score === undefined || score === null) {
            score = r.total_score || 0;
        }

        return {
            id: r.id,
            index: idx + 1,
            score: Number(score.toFixed(1)),
            date: new Date(r.completed_at!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
            isCurrent: r.id === id
        };
    });

    return (
        <ReportContent
            result={result}
            competencies={compMeta || []}
            questionsMap={questionsMap}
            answers={answers}
            qOrder={validQOrder}
            normMap={normsMap}
            trends={trendData}
            isAdmin={false}
        />
    );
}
