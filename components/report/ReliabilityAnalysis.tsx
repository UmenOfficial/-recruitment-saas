'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ChevronDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface Question {
    id: string;
    category: string;
    content: string;
}

interface ReliabilityAnalysisProps {
    questions: Question[];
    answers: Record<string, number>;
}

const EXCLUDED_SCALES = [
    '지시불이행', '거짓말', '자기신뢰도검증', '공격성', '의존성 성격장애',
    '편접성 성격장애', '불안/우울 장애', '조현형성격장애', '반사회적 성격장애', '경계선 성격장애'
];

interface AnalysisResult {
    title: string;
    status: 'PASS' | 'WARNING';
    message: string;
    details?: string;
}

export default function ReliabilityAnalysis({ questions, answers }: ReliabilityAnalysisProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<AnalysisResult[]>([]);

    const analyzeReliability = () => {
        const resultList: AnalysisResult[] = [];
        // 1. Standard Deviation Check
        const validStdDevItems = questions.filter(q => !EXCLUDED_SCALES.includes(q.category));
        const stdDevScores = validStdDevItems.map(q => answers[q.id]).filter(s => s !== undefined);

        if (stdDevScores.length > 1) {
            const mean = stdDevScores.reduce((a, b) => a + b, 0) / stdDevScores.length;
            const variance = stdDevScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (stdDevScores.length - 1);
            const stdDev = Math.sqrt(variance);

            if (stdDev <= 0.5) {
                resultList.push({
                    title: '무난함 뒤에 숨으면, 당신의 장점도 보이지 않습니다.',
                    status: 'WARNING',
                    message: "비슷한 답변의 반복은 당신을 흐릿한 배경처럼 보이게 만듭니다. 실수하지 않는 것에 집중하느라 당신이 가진 매력을 보여줄 기회를 놓치지 마세요. 조금 더 과감하게 당신의 호불호를 드러내도 괜찮습니다."
                });
            }
        }

        // 2. Social Desirability Check
        const validSocialItems = questions.filter(q => !EXCLUDED_SCALES.includes(q.category));
        if (validSocialItems.length > 0) {
            const highScores = validSocialItems.filter(q => (answers[q.id] || 0) >= 5).length;
            const ratio = highScores / validSocialItems.length;

            if (ratio >= 0.5) {
                resultList.push({
                    title: "완벽한 사람보다는 '진짜 사람'이 매력적입니다.",
                    status: 'WARNING',
                    message: "혹시 '정답'을 찾으려 애쓰셨나요? 기업은 천사를 채용하려는 것이 아닙니다. 자신의 강점과 약점을 정확히 아는 '사람'을 원합니다. 좋게 보이려 애쓰지 않아도 충분히 괜찮습니다. 있는 그대로의 당신을 믿어보세요."
                });
            }
        }

        // 3. Lie Scale Check
        const lieItems = questions.filter(q => q.category === '거짓말');
        if (lieItems.length > 0) {
            const lieCount = lieItems.filter(q => (answers[q.id] || 0) >= 4).length;
            if (lieCount >= 3) {
                resultList.push({
                    title: '작은 흠집이 당신을 더 인간적으로 만듭니다.',
                    status: 'WARNING',
                    message: "누구나 살면서 한 번쯤 겪는 실수나 부정적인 감정까지 감출 필요는 없습니다. 무결점의 완벽함은 오히려 신뢰를 떨어뜨리기도 합니다. 솔직한 인정이 가장 큰 전략입니다. 조금 더 마음을 열고 편안하게 다가와 주세요."
                });
            }
        }

        // 4. Non-Compliance Check
        const ncItems = questions.filter(q => q.category === '지시불이행');
        let mismatchCount = 0;
        ncItems.forEach(q => {
            const ans = answers[q.id];
            if (ans === undefined) return;

            let target = -1;
            if (q.content.includes("'매우 그렇다'")) target = 5;
            else if (q.content.includes("'그렇다'")) target = 4;
            else if (q.content.includes("'보통'") || q.content.includes("'보통이다'")) target = 3;
            else if (q.content.includes("'전혀 그렇지 않다'")) target = 1;
            else if (q.content.includes("'그렇지 않다'")) target = 2;

            if (target !== -1 && ans !== target) {
                mismatchCount++;
            }
        });

        if (mismatchCount >= 2) {
            resultList.push({
                title: "속도보다 중요한 것은 '집중'입니다.",
                status: 'WARNING',
                message: "혹시 너무 빠르게 답변하느라 문제 속의 이정표를 놓치진 않았나요? 업무 현장에서도 중요한 것은 속도가 아니라 정확한 지시 이행입니다. 조금만 템포를 늦추고, 질문 끝까지 시선을 머무르게 하세요."
            });
        }

        // 5. Self-Validation Check
        const svItems = questions.filter(q => q.category === '자기신뢰도검증');
        if (svItems.length > 0) {
            const svCount = svItems.filter(q => (answers[q.id] || 0) >= 4).length;
            if (svCount >= 3) {
                resultList.push({
                    title: '당신 자신을 조금 더 믿어주세요.',
                    status: 'WARNING',
                    message: "답변하는 과정에서 망설임이 느껴집니다. 혹시 내 답변이 평가에 나쁜 영향을 줄까 봐 걱정하셨나요? 당신이 당신을 믿지 못하면, 기업도 당신을 믿을 수 없습니다. 스스로에게 확신을 갖고 다시 마주해 보세요."
                });
            }
        }

        setResults(resultList);
    };

    useEffect(() => {
        if (!questions || !answers) return;
        analyzeReliability();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions, answers]);

    const warningCount = results.filter(r => r.status === 'WARNING').length;

    return (
        <div className="px-4">
            <div className={`bg-white border rounded-[2.5rem] transition-all duration-500 overflow-hidden ${isOpen
                ? 'p-8 lg:p-10 shadow-xl border-amber-100 ring-1 ring-amber-100'
                : 'p-4 shadow-sm border-slate-100 hover:shadow-md hover:border-slate-200'
                }`}>
                {/* Toggle Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between group outline-none"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${warningCount > 0
                            ? (isOpen ? 'bg-amber-500 shadow-amber-200' : 'bg-amber-500 shadow-amber-100')
                            : (isOpen ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors')
                            }`}>
                            {warningCount > 0 ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                        </div>
                        <div className="text-left">
                            <h2 className={`text-xl font-black tracking-tight transition-colors ${warningCount > 0 ? 'text-amber-600' : 'text-slate-700'
                                }`}>
                                응답 신뢰도 분석
                            </h2>
                            {!isOpen && (
                                <p className="text-sm font-medium text-slate-400 mt-1">
                                    {warningCount > 0
                                        ? <span className="text-amber-600 font-bold">{warningCount}개의 점검 필요 항목이 발견되었습니다.</span>
                                        : "분석 결과, 응답 패턴이 신뢰할 수 있는 수준입니다."}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 transition-all duration-500 ${isOpen ? 'rotate-180 bg-slate-100' : 'group-hover:bg-white group-hover:shadow-sm'}`}>
                        <ChevronDown size={20} />
                    </div>
                </button>

                {/* Collapsible Content */}
                <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-8' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        {results.length === 0 ? (
                            <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-emerald-800 mb-2">신뢰할 수 있는 응답입니다</h3>
                                <p className="text-emerald-600/80 font-medium max-w-md leading-relaxed">
                                    일관성 있고 솔직한 답변 패턴이 확인되었습니다.<br />
                                    당신의 결과는 충분히 신뢰할 수 있는 데이터입니다.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-sm font-medium flex items-start gap-3">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <p>
                                        다음 항목들에서 일반적이지 않은 응답 패턴이 감지되었습니다.
                                        이 결과가 당신의 실제 모습과 다르다면, 다음 검사에서는 조금 더 편안하고 솔직하게 임해보세요.
                                    </p>
                                </div>
                                {results.map((res, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-colors">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                                        <h3 className="text-lg font-black text-slate-700 mb-3 flex items-center gap-2">
                                            {res.title}
                                            {res.details && <span className="text-xs px-2 py-1 bg-slate-100 rounded-md text-slate-500 font-medium">{res.details}</span>}
                                        </h3>
                                        <p className="text-slate-600 text-sm leading-relaxed font-medium bg-slate-50/50 p-4 rounded-xl">
                                            "{res.message}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Interactive Hint */}
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2 px-6 rounded-full bg-slate-50 hover:bg-slate-100"
                            >
                                분석 내용 닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
