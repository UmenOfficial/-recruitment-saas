import { redirect, notFound } from "next/navigation";
import ReportContent from "@/components/report/ReportContent";
import { fetchCandidateReportData } from "./actions";

export const dynamic = 'force-dynamic';

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;

    // Fetch data using Secure Server Action (Bypassing RLS safely)
    const res = await fetchCandidateReportData(id);

    if (!res.success) {
        if (res.redirect) redirect(res.redirect);
        // If specific error, handle? For now 404
        console.error("Dashboard Load Error:", res.error);
        return notFound();
    }

    const { result, compMeta, questionsMap, practiceIds, normsMap, trendData } = res.data!;

    const answers = (result.answers_log as Record<string, number>) || {};
    const qOrder = (result.questions_order as string[]) || [];

    // Filter out practice questions from qOrder
    const validQOrder = qOrder.filter(qid => !practiceIds.includes(qid));

    // Convert norms transform if needed? The component expects Map?
    // The component ReportContent props: `normMap: Map<string, any>`
    // But data from server action is pure JSON object (Record).
    // Need to convert Record back to Map.

    const normsMapObj = new Map(Object.entries(normsMap));

    return (
        <ReportContent
            result={result}
            competencies={compMeta}
            questionsMap={questionsMap}
            answers={answers}
            qOrder={validQOrder}
            normMap={normsMapObj}
            trends={trendData}
            isAdmin={false}
        />
    );
}
