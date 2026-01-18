'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/global-client';
import { Search, User, FileText, ChevronRight, Settings, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReportContent from "@/components/report/ReportContent";

export const dynamic = 'force-dynamic';

interface TestResult {
    id: string;
    test_id: string;
    test_title?: string;
    test_type?: 'APTITUDE' | 'PERSONALITY';
    total_score: number;
    t_score?: number;
    completed_at: string | null;
    attempt_number: number;
}

interface Candidate {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    results: TestResult[];
}

import { fetchCandidatesList, fetchReportDetailAction, resetTestResultTime, deleteTestResult } from './actions';

// ... (imports remain same)

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Report Modal State
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportOwnerName, setReportOwnerName] = useState<string>('');
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    // Manage Modal State
    const [selectedResultToManage, setSelectedResultToManage] = useState<TestResult | null>(null);
    const [manageOwnerName, setManageOwnerName] = useState<string>('');
    const [isManageOpen, setIsManageOpen] = useState(false);

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        setLoading(true);
        const result = await fetchCandidatesList();
        if (result.success && result.data) {
            setCandidates(result.data);
        } else {
            console.error(result.error);
            toast.error('지원자 목록을 불러오는데 실패했습니다.');
        }
        setLoading(false);
    };

    const fetchReportDetail = async (resultId: string) => {
        setLoadingReport(true);
        setReportData(null);

        const res = await fetchReportDetailAction(resultId);

        if (!res.success || !res.data) {
            toast.error("리포트 데이터를 불러오는데 실패했습니다.");
            setLoadingReport(false);
            return;
        }

        const { result, competencies, questions, norms, history } = res.data;

        try {
            const normsMap = new Map((norms || []).map((n: any) => [n.category_name, n]));

            const questionsMap: Record<string, any> = {};
            const practiceIds = new Set<string>();
            questions?.forEach((r: any) => {
                const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
                if (q) {
                    questionsMap[q.id] = q;
                    if (r.is_practice) practiceIds.add(q.id);
                }
            });

            const answers = (result.answers_log as Record<string, number>) || {};

            let rawQOrder = (result.questions_order as string[]) || [];
            if (rawQOrder.length === 0) {
                rawQOrder = Object.values(questionsMap)
                    .filter((q: any) => !practiceIds.has(q.id))
                    .map((q: any) => q.id);
            }

            const validQOrder = rawQOrder.filter((qid: string) => !practiceIds.has(qid));

            const trendData = (history || []).map((r: any, idx: number) => {
                const detailedTotal = (r.detailed_scores as any)?.total;
                let score = typeof detailedTotal === 'number' ? detailedTotal : detailedTotal?.t_score;
                if (score === undefined || score === null) score = r.total_score || 0;

                return {
                    id: r.id, index: idx + 1, score: Number(score.toFixed(1)),
                    date: new Date(r.completed_at!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                    isCurrent: r.id === resultId
                };
            });

            setReportData({
                result,
                competencies: competencies || [],
                questionsMap,
                answers,
                qOrder: validQOrder,
                normMap: normsMap,
                trends: trendData
            });

        } catch (e) {
            console.error(e);
            toast.error("리포트 처리 중 오류가 발생했습니다.");
        } finally {
            setLoadingReport(false);
        }
    }

    const handleOpenReport = async (resultId: string, ownerName: string) => {
        setSelectedReportId(resultId);
        setReportOwnerName(ownerName);
        await fetchReportDetail(resultId);
    };

    const handleOpenManage = (result: TestResult, ownerName: string) => {
        setSelectedResultToManage(result);
        setManageOwnerName(ownerName);
        setIsManageOpen(true);
    };

    const handleResetTime = async () => {
        if (!selectedResultToManage) return;

        if (!confirm('정말 응시 시간을 초기화하시겠습니까?\n응시자의 문항 답변 기록은 유지되지만, 시간 제한과 완료 상태가 초기화됩니다.')) {
            return;
        }

        const result = await resetTestResultTime(selectedResultToManage.id);

        if (result.success) {
            toast.success('응시 시간이 초기화되었습니다.');
            setIsManageOpen(false);
            loadCandidates();
        } else {
            toast.error(`초기화 실패: ${result.error}`);
        }
    };

    const handleDeleteResult = async () => {
        if (!selectedResultToManage) return;

        if (!confirm('경고: 정말 이 검사 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 수검자는 처음부터 다시 응시해야 합니다.')) {
            return;
        }

        const result = await deleteTestResult(selectedResultToManage.id);

        if (result.success) {
            toast.success('검사 기록이 삭제되었습니다.');
            setIsManageOpen(false);
            loadCandidates();
        } else {
            toast.error(`삭제 실패: ${result.error}`);
        }
    };

    // Callback for HistoryNavigator inside the modal
    const handleAttemptSelect = async (newResultId: string) => {
        // Just update the content, keeping modal open
        await fetchReportDetail(newResultId);
    };

    const filteredCandidates = candidates.filter(c =>
    (c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getScoreDisplay = (results: TestResult[], type: 'APTITUDE' | 'PERSONALITY') => {
        // Prioritize Latest Completed Attempt
        const target = results
            .filter(r => r.test_type === type && r.completed_at)
            .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

        if (!target) return <span className="text-slate-300">-</span>;

        const score = type === 'PERSONALITY' ? (target.t_score ?? target.total_score) : target.total_score;

        return (
            <div className="flex flex-col items-center">
                <span className={`font-bold ${score >= 60 ? 'text-blue-600' : 'text-slate-700'}`}>
                    {score}점
                </span>
                <span className="text-[10px] text-slate-400 max-w-[80px] truncate" title={target.test_title}>
                    {target.test_title}
                </span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" richColors />

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">전체 지원자 현황</h1>
                    <p className="text-slate-500">가입된 모든 응시자의 목록과 검사 결과를 확인합니다.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="이름 또는 이메일 검색"
                            className="pl-10 pr-4 py-2 border rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-slate-500">
                        총 <span className="font-bold text-slate-900">{filteredCandidates.length}</span>명
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-slate-400">Loading...</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">지원자 성명</th>
                                <th className="px-6 py-4">이메일</th>
                                <th className="px-6 py-4">가입일</th>
                                <th className="px-6 py-4 text-center">인성검사</th>
                                <th className="px-6 py-4 text-center">적성검사</th>
                                <th className="px-6 py-4 text-right">리포트 및 관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map(candidate => {
                                    // Group results by test_id and pick the latest one for each test
                                    const completedTests = candidate.results.filter(r => r.completed_at);

                                    // Grouping Logic
                                    const groupedResults: Record<string, { latest: TestResult, count: number }> = {};
                                    completedTests.forEach(r => {
                                        if (!groupedResults[r.test_id]) {
                                            groupedResults[r.test_id] = { latest: r, count: 0 };
                                        }
                                        groupedResults[r.test_id].count += 1;
                                        // Update if this one is newer
                                        if (new Date(r.completed_at!) > new Date(groupedResults[r.test_id].latest.completed_at!)) {
                                            groupedResults[r.test_id].latest = r;
                                        }
                                    });

                                    return (
                                        <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                    <User size={14} />
                                                </div>
                                                {candidate.full_name || '이름 없음'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {candidate.email}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(candidate.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getScoreDisplay(candidate.results, 'PERSONALITY')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getScoreDisplay(candidate.results, 'APTITUDE')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col gap-1 items-end">
                                                    {Object.keys(groupedResults).length === 0 ? (
                                                        <span className="text-xs text-slate-400">응시 이력 없음</span>
                                                    ) : (
                                                        Object.values(groupedResults).map(group => {
                                                            const r = group.latest;
                                                            return (
                                                                <div key={r.id} className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleOpenReport(r.id, candidate.full_name || candidate.email)}
                                                                        className="group flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-blue-100 transition-all"
                                                                    >
                                                                        <FileText size={12} className="text-slate-400 group-hover:text-blue-500" />
                                                                        <span>{r.test_title}</span>
                                                                        {group.count > 1 && (
                                                                            <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                                                                                총 {group.count}회
                                                                            </Badge>
                                                                        )}
                                                                        <span className="text-slate-300 group-hover:text-blue-400 ml-0.5">
                                                                            {r.attempt_number}회차
                                                                        </span>
                                                                        <ChevronRight size={10} className="text-slate-300 group-hover:text-blue-500" />
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleOpenManage(r, candidate.full_name || candidate.email)}
                                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                                        title="결과 관리 (초기화/삭제)"
                                                                    >
                                                                        <Settings size={14} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Report Modal */}
            <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50">
                    <div className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-800">
                                {reportOwnerName ? `${reportOwnerName}님의 My Value Report` : "My Value Report"}
                            </h2>
                            {reportData?.result?.completed_at && (
                                <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-md">
                                    응시일: {new Date(reportData.result.completed_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 h-full bg-slate-50">
                        <div className="p-6">
                            {loadingReport ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                                    <p>리포트를 불러오는 중입니다...</p>
                                </div>
                            ) : reportData ? (
                                <ReportContent
                                    {...reportData}
                                    isAdmin={true}
                                    onSelectAttempt={handleAttemptSelect}
                                />
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    데이터를 불러올 수 없습니다.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Manage Modal */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{manageOwnerName}님의 검사 결과 관리</DialogTitle>
                        <DialogDescription>
                            검사명: {selectedResultToManage?.test_title} ({selectedResultToManage?.attempt_number}회차)
                            <br />
                            응시일: {selectedResultToManage?.completed_at ? new Date(selectedResultToManage.completed_at).toLocaleDateString() : '-'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-4">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <RotateCcw size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 mb-1">시간/상태 초기화</h4>
                                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                    답변 기록은 <b>유지</b>하되, 소요 시간을 0으로 되돌리고 완료 상태를 해제합니다.
                                    <br />
                                    수검자가 <u>이어서 응시</u>할 수 있습니다.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-blue-700 hover:text-blue-800 hover:bg-blue-100 border-blue-200"
                                    onClick={handleResetTime}
                                >
                                    시간 초기화 실행
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <Trash2 size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-red-800 mb-1">검사 기록 삭제</h4>
                                <p className="text-xs text-red-600/80 mb-3 leading-relaxed">
                                    해당 회차의 모든 기록을 <b>완전히 삭제</b>합니다.
                                    <br />
                                    수검자는 <u>처음부터 새로 시작</u>해야 합니다.
                                </p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleDeleteResult}
                                >
                                    기록 삭제 실행
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsManageOpen(false)}>닫기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
