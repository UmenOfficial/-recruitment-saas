'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAptitudeReportData } from './actions';
import { ChevronLeft, CheckCircle2, XCircle, Info, Award, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import AptitudeInterpretationGuide from './AptitudeInterpretationGuide';

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

    if (loading) return <div className="p-12 text-center text-slate-500">리포트를 분석 중입니다...</div>;
    if (!data) return null;

    const { result, questions, metrics } = data;
    const answers = result.answers_log || {};
    const avgScore = metrics?.avgScore || 0;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 relative px-4 pt-8">
            {/* Navigation */}
            <Link href="/candidate/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm mb-4">
                <ChevronLeft size={16} />
                대시보드로 돌아가기
            </Link>

            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Award className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Aptitude Report</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-500">
                        {result.tests?.title}{' '}
                        <span className="ml-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Deep Dive</span>
                    </h1>
                </div>
            </header>

            {/* Interpretation Guide */}
            <div className="-mx-4 md:mx-0">
                <AptitudeInterpretationGuide />
            </div>

            {/* Score Comparison Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                {/* My Score */}
                <div className="bg-white border border-slate-100/60 rounded-[2.5rem] p-12 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group hover:shadow-md transition-all duration-500">
                    <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-80"></div>
                    <h2 className="text-slate-500 font-bold mb-6 uppercase tracking-wider text-xs">나의 종합 점수</h2>
                    <div className="text-[100px] font-black text-slate-800 tracking-tighter mb-4 leading-none group-hover:scale-105 transition-transform duration-500">
                        {Math.round(result.total_score)}
                    </div>
                    <div className="text-slate-400 font-bold text-sm bg-slate-50 px-4 py-1.5 rounded-full">
                        총점 <span className="text-slate-600">100</span>점 만점
                    </div>
                </div>

                {/* Avg Score */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center relative">
                    <h2 className="text-slate-400 font-bold mb-6 uppercase tracking-wider text-xs flex items-center gap-2">
                        <TrendingUp size={14} /> 전체 응시자 평균
                    </h2>
                    <div className="text-[100px] font-black text-slate-300 tracking-tighter mb-4 leading-none">
                        {Math.round(avgScore)}
                    </div>
                    <div className="text-slate-400 font-medium text-sm">
                        상위 <span className="text-purple-600 font-bold">{
                            result.total_score > avgScore ? '평균 이상' : '평균 이하'
                        }</span>의 성취도
                    </div>
                </div>
            </div>

            {/* Question Analysis List */}
            <div className="space-y-6 px-4">
                <h3 className="text-2xl font-extrabold text-slate-800">문항별 상세 분석</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questions.map((q: any, idx: number) => {
                        const userAnswer = answers[q.id];
                        const isCorrect = String(userAnswer) === String(q.correct_answer);
                        const isExpanded = expandedQ === q.id;
                        const globalRate = q.stats?.rate || 0;
                        const options = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];

                        return (
                            <div key={q.id} className={`bg-white rounded-2xl border transition-all duration-300 ${isExpanded ? 'border-purple-200 shadow-md col-span-1 md:col-span-2' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
                                <div
                                    className="p-6 cursor-pointer hover:bg-slate-50/50 flex items-center justify-between gap-4"
                                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                            Q{idx + 1}
                                        </div>
                                        <div className="flex flex-col">
                                            {isCorrect ? (
                                                <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                                                    <CheckCircle2 size={16} />
                                                    <span>정답</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-500 font-bold text-sm">
                                                    <XCircle size={16} />
                                                    <span>오답</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Global Rate Bar (Reduced Width) */}
                                    <div className="flex flex-col items-end gap-1 min-w-[100px]">
                                        <div className="flex justify-between w-full text-[10px] font-bold text-slate-400">
                                            <span>정답률</span>
                                            <span className="text-slate-600">{globalRate}%</span>
                                        </div>
                                        <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${globalRate >= 70 ? 'bg-blue-400' : globalRate >= 40 ? 'bg-indigo-400' : 'bg-slate-400'}`}
                                                style={{ width: `${globalRate}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right: Expand Icon */}
                                    <div className="text-slate-300">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="bg-slate-50/50 border-t border-slate-100 p-6 md:p-8 animate-in slide-in-from-top-2 duration-200 space-y-8">

                                        {/* Question Content & Options */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                                                <span className="text-slate-400">Q{idx + 1}.</span>
                                                <span>{q.content}</span>
                                            </div>
                                            {options.length > 0 && (
                                                <div className="grid grid-cols-1 gap-2 pl-4">
                                                    {options.map((opt: string, i: number) => (
                                                        <div key={i} className={`text-sm p-3 rounded-lg border ${String(i + 1) === String(q.correct_answer) ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : String(i + 1) === String(userAnswer) && !isCorrect ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}>
                                                            {i + 1}. {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-200/50 pt-8">
                                            {/* Explanation */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3 text-purple-700 font-bold text-sm">
                                                    <Info size={16} />
                                                    <span>해설 및 풀이</span>
                                                </div>
                                                <div className="bg-white p-6 rounded-2xl border border-purple-50 shadow-sm text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                                                    {q.description || "해설이 등록되지 않은 문항입니다."}
                                                </div>
                                            </div>

                                            {/* My Answer vs Correct & Wrong Note Msg */}
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3 text-slate-500 font-bold text-sm">
                                                        <Award size={16} />
                                                        <span>답안 비교</span>
                                                    </div>
                                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                                            <span className="text-sm font-medium text-slate-500">내가 선택한 답</span>
                                                            <span className={`text-lg font-black ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                                                {userAnswer || '-'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-slate-500">실제 정답</span>
                                                            <span className="text-lg font-black text-blue-600">
                                                                {q.correct_answer}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {!isCorrect && (
                                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                                        <Info className="text-red-500 mt-0.5 shrink-0" size={16} />
                                                        <div>
                                                            <div className="text-sm font-bold text-red-600 mb-1">오답 노트 확인 필요</div>
                                                            <div className="text-xs text-red-500 leading-relaxed">
                                                                이 문항은 틀렸습니다. 대시보드의 <span className="font-bold underline">오답노트</span> 메뉴에서 다시 한 번 복습해 보세요!
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
