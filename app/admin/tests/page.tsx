'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Users, Activity, ToggleLeft, ToggleRight, ArrowRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface TestSummary {
    id: string;
    title: string;
    type: 'APTITUDE' | 'PERSONALITY';
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    created_at: string;
    respondent_count: number;
    question_count: number;
}

export default function TestsDashboard() {
    const [tests, setTests] = useState<TestSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Tests with Question Counts
            const { data: testsData, error: tError } = await supabase
                .from('tests')
                .select(`
                    *,
                    test_questions(count)
                `)
                .order('created_at', { ascending: false });

            if (tError) throw tError;

            // 2. Fetch Respondent Counts (Group by test_id)
            // Note: Supabase doesn't support complex group by with join easily in one query without RPC.
            // For now, we fetch all test_results.test_id or use a separate query.
            // Given scale might be small initially, valid strategy:
            // Fetch counts via .rpc if likely large, or just select count per test if possible.
            // Actually, we can fetch all results with test_id (heavy?) or just iterate.
            // Optimization: Let's assume we can get counts.
            // Alternative: select test_id from test_results.

            const { data: resultsData, error: rError } = await supabase
                .from('test_results')
                .select('test_id');

            if (rError) throw rError;

            // Count map
            const countMap: Record<string, number> = {};
            resultsData?.forEach((r: any) => {
                if (r.test_id) {
                    countMap[r.test_id] = (countMap[r.test_id] || 0) + 1;
                }
            });

            // Merge Data
            const summaries: TestSummary[] = testsData.map((t: any) => ({
                id: t.id,
                title: t.title,
                type: t.type,
                status: t.status,
                created_at: t.created_at,
                respondent_count: countMap[t.id] || 0,
                question_count: t.test_questions?.[0]?.count || 0
            }));

            setTests(summaries);

        } catch (error) {
            console.error(error);
            toast.error('대시보드 데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (test: TestSummary) => {
        const newStatus = test.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
        try {
            const { error } = await (supabase
                .from('tests') as any)
                .update({ status: newStatus })
                .eq('id', test.id);
            // The following lines were part of the instruction but seem to be out of context for this function.
            // They refer to 'data' and 'selectedTestId' which are not defined here.
            // if (data && data.length > 0 && !selectedTestId) {
            //     setSelectedTestId((data as any)[0].id);
            // }
            if (error) throw error;

            toast.success(`검사 상태가 ${newStatus === 'ACTIVE' ? '활성화' : '비활성화'}되었습니다.`);

            setTests(prev => prev.map(t =>
                t.id === test.id ? { ...t, status: newStatus } : t
            ));

        } catch (error) {
            toast.error('상태 변경 실패');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <LayoutDashboard size={28} className="text-slate-600" />
                    통합 검사 대시보드
                </h1>
                <p className="text-slate-500 mt-1">
                    등록된 모든 적성/인성 검사의 현황을 한눈에 확인하고 배포 상태를 관리합니다.
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">현황 데이터를 분석 중입니다...</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <FileText size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-400">총 검사지</div>
                                <div className="text-2xl font-bold text-slate-800">{tests.length}개</div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                <Activity size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-400">활성화(배포)됨</div>
                                <div className="text-2xl font-bold text-slate-800">
                                    {tests.filter(t => t.status === 'ACTIVE').length}개
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <Users size={24} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-400">총 누적 응시자</div>
                                <div className="text-2xl font-bold text-slate-800">
                                    {tests.reduce((acc, t) => acc + t.respondent_count, 0).toLocaleString()}명
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test List Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">검사 목록</h2>
                            <div className="flex gap-2">
                                <Link
                                    href="/admin/tests/aptitude"
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors"
                                >
                                    적성검사 관리
                                </Link>
                                <Link
                                    href="/admin/tests/personality"
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                >
                                    인성검사 관리
                                </Link>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white text-slate-500 font-medium border-b">
                                    <tr>
                                        <th className="px-6 py-4">검사명</th>
                                        <th className="px-6 py-4">유형</th>
                                        <th className="px-6 py-4">문항 수</th>
                                        <th className="px-6 py-4">누적 응시</th>
                                        <th className="px-6 py-4">상태 (배포)</th>
                                        <th className="px-6 py-4 text-right">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tests.map(test => (
                                        <tr key={test.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                {test.title}
                                                <div className="text-xs font-normal text-slate-400 mt-0.5">
                                                    ID: {test.id.slice(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${test.type === 'APTITUDE'
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-indigo-50 text-indigo-700'
                                                    }`}>
                                                    {test.type === 'APTITUDE' ? '적성검사' : '인성검사'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {test.question_count}문항
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                    <Users size={14} className="text-slate-400" />
                                                    {test.respondent_count.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleStatus(test)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${test.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {test.status === 'ACTIVE' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                    <span className="text-xs font-bold">
                                                        {test.status === 'ACTIVE' ? '배포됨(Active)' : '비공개(Draft)'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={test.type === 'APTITUDE'
                                                        ? `/admin/tests/aptitude/${test.id}`
                                                        : `/admin/tests/personality/${test.id}`
                                                    }
                                                    className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-600 font-bold text-xs"
                                                >
                                                    상세 설정 <ArrowRight size={12} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {tests.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                등록된 검사가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
