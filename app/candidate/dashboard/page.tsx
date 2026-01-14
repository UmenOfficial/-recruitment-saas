import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Award, Calendar, ChevronRight, FileText, LayoutGrid, CheckCircle2, RefreshCw, TrendingUp } from "lucide-react";

export const dynamic = 'force-dynamic';

function calculatePercentile(tScore: number) {
    const z = (tScore - 50) / 10;
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2.0);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const percentile = z >= 0 ? 1.0 - p : p;
    // Ensure we don't return 0% for high performers. Minimum is Top 1%.
    return Math.max(1, Math.round((1 - percentile) * 100));
}

export default async function CandidateDashboard() {
    const supabase = await createClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login?next=/candidate/dashboard");
    }

    // Fetch All Test Results
    const { data: results } = await supabase
        .from("test_results")
        .select(`
            id,
            total_score,
            completed_at,
            created_at,
            test_id,
            tests ( id, title, type, description )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

    // Grouping by Test
    const groups: Record<string, any> = {};
    results?.forEach((r) => {
        const testId = r.test_id;
        if (!groups[testId]) {
            groups[testId] = {
                test: r.tests,
                bestScore: r.total_score || 0,
                bestResultId: r.id,
                attemptCount: 0,
                latestDate: r.completed_at || r.created_at,
            };
        }
        groups[testId].attemptCount += 1;
        if ((r.total_score || 0) >= groups[testId].bestScore) {
            groups[testId].bestScore = r.total_score || 0;
            groups[testId].bestResultId = r.id;
        }
        // Always take the latest actual completion if available
        const currentDate = new Date(r.completed_at || r.created_at);
        const groupDate = new Date(groups[testId].latestDate);
        if (currentDate > groupDate) {
            groups[testId].latestDate = r.completed_at || r.created_at;
        }
    });

    const groupedResults = Object.values(groups);

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header Section */}
            <header className="px-4">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-2">
                    <LayoutGrid size={18} />
                    <span>MY DASHBOARD</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-800">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">My Value Report</span>
                </h1>
                <p className="text-slate-500 font-medium mt-2">
                    응시하신 검사별 최고 성적과 상세 리포트를 확인하실 수 있습니다.
                </p>
            </header>

            {groupedResults.length === 0 ? (
                <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                    <FileText size={64} className="text-slate-200 mb-6" />
                    <h2 className="text-2xl font-black tracking-tight text-slate-700 mb-2">아직 완료된 검사가 없습니다.</h2>
                    <p className="text-slate-500 mb-8 max-w-sm">첫 번째 검사를 완료하고 당신의 감추어진 가능성을 발견해 보세요.</p>
                    <Link
                        href="/candidate/personality"
                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                        검사 목록 보러가기 <ArrowRight size={20} />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                    {groupedResults.map((group: any) => {
                        const topPercent = calculatePercentile(group.bestScore);

                        return (
                            <Link
                                key={group.test.id}
                                href={`/candidate/dashboard/${group.bestResultId}`}
                                className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col h-fit"
                            >
                                {/* Accent Glow (Centered & deeper) */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-400 rounded-full blur-[60px] opacity-0 group-hover:opacity-30 transition-all duration-700 pointer-events-none"></div>

                                {/* Top Section: Icon & Title */}
                                <div className="flex items-start gap-4 mb-8">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                                        <Award size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight text-slate-800 group-hover:text-blue-900 transition-colors leading-tight line-clamp-2 min-h-[3.5rem] flex items-center">
                                        {group.test.title}
                                    </h3>
                                </div>

                                {/* Middle Section: Score & Badges (Precisely Aligned) */}
                                <div className="mb-6">
                                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">BEST SCORE</div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-baseline text-[64px] font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors leading-none">
                                            {group.bestScore.toFixed(1).split('.')[0]}
                                            <span className="text-[32px] tracking-normal">.{group.bestScore.toFixed(1).split('.')[1]}</span>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-center gap-1.5 w-28 h-7 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold">
                                                <TrendingUp size={12} />
                                                상위 {topPercent}%
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 w-28 h-7 bg-slate-50 text-slate-500 rounded-xl text-[11px] font-bold">
                                                <RefreshCw size={12} />
                                                {group.attemptCount}회 응시
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section: Date */}
                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                                        <Calendar size={14} />
                                        최근 {new Date(group.latestDate).toLocaleDateString('ko-KR')}
                                    </div>
                                    <ChevronRight size={18} className="text-blue-600 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" />
                                </div>
                            </Link>
                        );
                    })}

                    {/* Quick Link Card */}
                    <Link
                        href="/candidate/personality"
                        className="group border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center gap-4 hover:border-blue-400 hover:bg-blue-50/20 transition-all duration-300 h-full min-h-[300px]"
                    >
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700">새로운 검사 응시하기</h4>
                            <p className="text-xs text-slate-400 mt-1">나의 또 다른 가능성을 확인하세요.</p>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    );
}
