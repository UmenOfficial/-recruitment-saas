'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getAptitudeReportData } from './actions';
import { ChevronLeft, CheckCircle, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function AptitudeReportPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await getAptitudeReportData(id);
            if (!res.success) throw new Error(res.error);
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('리포트를 불러올 수 없습니다.');
            router.push('/candidate/dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center">Loading Report...</div>;
    if (!data) return null;

    const { result, questions } = data;
    const answers = result.answers_log || {};

    // Sort questions by some order if possible, or just keep array order
    // Ideally we should preserve the order from the test, but we only have question IDs here.
    // Let's sort simply by ID or created_at for stability, or layout order if we had it.

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <h1 className="font-bold text-lg">적성검사 결과 리포트</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Score Card */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
                    <h2 className="text-slate-500 font-bold mb-2">{result.tests?.title}</h2>
                    <div className="text-5xl font-black text-blue-600 mb-2">
                        {result.total_score} <span className="text-2xl text-slate-400 font-medium">/ 100</span>
                    </div>
                    <p className="text-slate-400 text-sm">종합 점수 (문항당 10점)</p>
                </div>

                {/* Question List */}
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-800 ml-1">문항 분석</h3>
                    {questions.map((q: any, idx: number) => {
                        const userAnswer = answers[q.id];
                        const isCorrect = String(userAnswer) === String(q.correct_answer);
                        const isExpanded = expandedQ === q.id;

                        return (
                            <div key={q.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all">
                                <div
                                    className="p-5 cursor-pointer hover:bg-slate-50 flex gap-4"
                                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                                >
                                    <div className="mt-1">
                                        {isCorrect ? (
                                            <div className="flex flex-col items-center gap-1 w-12">
                                                <CheckCircle className="text-green-500" size={24} />
                                                <span className="text-[10px] font-bold text-green-600 px-1.5 py-0.5 bg-green-50 rounded">정답</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 w-12">
                                                <XCircle className="text-red-500" size={24} />
                                                <span className="text-[10px] font-bold text-red-600 px-1.5 py-0.5 bg-red-50 rounded">오답</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-400 mb-1">{q.category}</div>
                                        <p className="font-medium text-slate-800 text-lg leading-snug mb-2">{q.content}</p>
                                        <div className="text-sm text-slate-500">
                                            내 답안: <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{userAnswer || '-'}</span>
                                            {' / '}
                                            정답: <span className="font-bold text-blue-600">{q.correct_answer}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="bg-slate-50 border-t border-slate-100 p-5 pl-20 animate-in slide-in-from-top-2 duration-200">
                                        {/* Explanation */}
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
                                                <Info size={16} />
                                                <span>해설 및 풀이</span>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-blue-100 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                                                {q.description || "해설이 등록되지 않은 문항입니다."}
                                            </div>
                                        </div>

                                        {/* Global Stats */}
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                                <span>전체 정답률</span>
                                                <span>{q.stats?.rate || 0}% ({q.stats?.total || 0}명 응시)</span>
                                            </div>
                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-500"
                                                    style={{ width: `${q.stats?.rate || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
