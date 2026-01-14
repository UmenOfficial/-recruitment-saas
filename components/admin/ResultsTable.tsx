'use client';

import { useState } from 'react';
import { ArrowUpDown, Mail, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CandidateResult {
    id: string;
    name: string;
    email: string;
    applied_at: string;
    test_score: number;
    guest_avg_score: number | null;
    status: string;
}

interface ResultsTableProps {
    candidates: CandidateResult[];
    onStatusUpdate: (id: string, newStatus: 'PASS' | 'FAIL') => Promise<void>;
}

/**
 * 결과 테이블 컴포넌트
 * 
 * 지원자 목록을 테이블 형태로 표시하고 정렬(Sort) 및 합불 처리(Action) 기능을 제공합니다.
 * 게스트 평가 점수와 테스트 점수를 시각적으로 보여줍니다.
 */
export default function ResultsTable({ candidates, onStatusUpdate }: ResultsTableProps) {
    const [sortField, setSortField] = useState<keyof CandidateResult>('guest_avg_score');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const sortedCandidates = [...candidates].sort((a, b) => {
        const aVal = a[sortField] ?? -1;
        const bVal = b[sortField] ?? -1;

        if (aVal === bVal) return 0;
        if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
    });

    const handleSort = (field: keyof CandidateResult) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const handleAction = async (id: string, action: 'PASS' | 'FAIL') => {
        const actionText = action === 'PASS' ? '합격' : '불합격';
        if (!confirm(`정말 이 지원자를 '${actionText}' 처리하시겠습니까?\n해당 결과가 지원자에게 이메일로 발송됩니다.`)) return;

        setProcessingId(id);
        try {
            await onStatusUpdate(id, action);
            toast.success(`지원자가 ${actionText} 처리되었으며 이메일이 발송되었습니다.`);
        } catch (e: any) {
            toast.error('처리 실패: ' + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                        <tr>
                            <th className="p-4 pl-6 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                                지원자 성명
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('applied_at')}>
                                지원일
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('test_score')}>
                                시험 점수 <ArrowUpDown size={14} className="inline ml-1" />
                            </th>
                            <th className="p-4 cursor-pointer hover:bg-slate-100 text-blue-700 bg-blue-50/50" onClick={() => handleSort('guest_avg_score')}>
                                평가 점수(평균) <ArrowUpDown size={14} className="inline ml-1" />
                            </th>
                            <th className="p-4">상태</th>
                            <th className="p-4 text-right pr-6">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedCandidates.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                    이 공고에 대한 지원자가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            sortedCandidates.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 pl-6 font-medium text-slate-900">{c.name}</td>
                                    <td className="p-4 text-slate-500">{new Date(c.applied_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${c.test_score >= 80 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {c.test_score}점
                                        </span>
                                    </td>
                                    <td className="p-4 bg-blue-50/10">
                                        {c.guest_avg_score !== null ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600" style={{ width: `${c.guest_avg_score}%` }}></div>
                                                </div>
                                                <span className="font-bold text-blue-700">{c.guest_avg_score}점</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">평가중</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`
                      px-2 py-1 rounded-full text-xs font-medium border
                      ${c.status === 'PASS' ? 'bg-green-50 text-green-700 border-green-200' :
                                                c.status === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'}
                    `}>
                                            {c.status === 'PASS' ? '합격' : c.status === 'FAIL' ? '불합격' : c.status === 'APPLIED' ? '지원완료' : '시험완료'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleAction(c.id, 'PASS')}
                                                disabled={!!processingId || c.status === 'PASS'}
                                                title="합격 처리 및 이메일 발송"
                                                className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-30 transition-colors"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleAction(c.id, 'FAIL')}
                                                disabled={!!processingId || c.status === 'FAIL'}
                                                title="불합격 처리 및 이메일 발송"
                                                className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-30 transition-colors"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
