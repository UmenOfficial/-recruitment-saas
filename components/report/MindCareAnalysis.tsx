'use client';

import { useState, useEffect } from 'react';
import { HeartPulse, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';

interface MindCareAnalysisProps {
    detailedScores: any;
}

interface MindCareResult {
    scale: string;
    title: string;
    subTitle: string;
    message: string;
    tScore: number;
}

const MIND_CARE_SCALES: Record<string, { title: string, subTitle: string, message: string }> = {
    '불안/우울 장애': {
        title: "회복이 필요한 마음 (Deep Rest)",
        subTitle: "지금 마음의 배터리가 깜빡이고 있습니다.",
        message: "걱정이 꼬리를 물고, 의욕이 잘 나지 않나요? 이건 당신이 약해서가 아니라, 그동안 너무 애썼다는 신호입니다. 지금은 자신을 몰아세울 때가 아니라, 잠시 멈춰서 마음을 충전해야 할 타이밍입니다."
    },
    '공격성': {
        title: "가라앉지 않은 열기 (Over-Heat)",
        subTitle: "열정이 과하면 가시가 돋습니다.",
        message: "강한 에너지는 큰 장점이지만, 스트레스를 받으면 그 에너지가 날카로운 말이나 행동으로 튀어나갈 수 있습니다. 타인을 향한 화살을 잠시 거두고, 그 뜨거운 에너지를 당신의 목표를 태우는 연료로만 사용하세요."
    },
    '조현형성격장애': {
        title: "남다른 주파수 (Unique Frequency)",
        subTitle: "독창성과 혼란스러움은 종이 한 장 차이입니다.",
        message: "남들이 생각하지 못하는 독특한 시선을 가졌군요. 하지만 가끔은 그 생각이 너무 멀리 튀어 주변 사람들이 이해하기 어려울 수 있습니다. 당신의 특별한 생각이 세상과 잘 연결되도록 '통역'하는 연습이 필요합니다."
    },
    '반사회적 성격장애': {
        title: "길들여지지 않은 야생마 (Wild Spirit)",
        subTitle: "자유로움에도 신호등은 필요합니다.",
        message: "자신의 이익을 챙기는 명민함과 틀을 깨는 대담함이 있습니다. 하지만 규칙은 우리를 가두는 감옥이 아니라, 서로를 보호하는 울타리입니다. 이 울타리를 존중할 때 당신의 능력은 더 안전하게 빛날 수 있습니다."
    },
    '경계선 성격장애': {
        title: "다이내믹한 감성 (Dynamic Wave)",
        subTitle: "감정의 파도를 타는 서퍼가 되세요.",
        message: "풍부한 감성은 세상을 다채롭게 보게 해주지만, 때로는 거친 파도처럼 당신을 덮치기도 합니다. 기분이 급격히 변할 때, 그 감정에 휩쓸리지 않고 한발 물러서서 바라보는 '마음의 닻'을 내려보세요."
    },
    '의존성 성격장애': {
        title: "겸손과 확신 사이 (Need Confidence)",
        subTitle: "당신의 판단을 믿어도 좋습니다.",
        message: "타인을 배려하고 따르는 것은 훌륭한 미덕입니다. 하지만 그 배려가 '나에 대한 의심'에서 시작된 것은 아닌지 돌아보세요. 누구보다 당신을 잘 아는 전문가는 바로 당신입니다. 조금 더 고집을 부려도 괜찮습니다."
    },
    '편접성 성격장애': {
        title: "너무 예민한 레이더 (Over-Sensing)",
        subTitle: "모든 신호를 다 잡을 필요는 없습니다.",
        message: "남들이 놓치는 의도까지 읽어내는 섬세한 레이더를 가졌군요. 하지만 지나친 경계심은 타인의 호의조차 왜곡해서 보게 만듭니다. 가끔은 레이더를 끄고, 보이는 그대로를 믿는 '둔감력'이 당신의 마음을 편하게 해 줄 거예요."
    }
};

// "편집성 성격장애" might be "편접성 성격장애" in DB or user prompt typo?
// User prompt wrote: '편접성 성격장애' (Typo? Usually 편집성). But listed '편접성 성격장애' in the list.
// Later in description: '7. 편집성 성격장애'.
// I should handle both keys just in case, or check the DB.
// Let's assume the key coming from DB is standard. I'll check `categories` variable in page if possible, but safer to match loosely or try both.
// Actually, looking at ReliabilityAnalysis.tsx, it has '편접성 성격장애' in EXCLUDED_SCALES. So likely it is stored as '편접성 성격장애'.
// Wait, prompt says: '편접성 성격장애'.
// I'll stick to '편접성 성격장애' as likely key, but visual title says '편집성 성격장애' in typical psychology.
// Prompt text 7 says "편집성 성격장애". Key in list says '편접성 성격장애'.
// I will use '편접성 성격장애' for key matching, but the Title in UI is from the object above.

export default function MindCareAnalysis({ detailedScores }: MindCareAnalysisProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<MindCareResult[]>([]);

    useEffect(() => {
        if (!detailedScores?.scales) return;
        analyzeScores();
    }, [detailedScores]);

    const analyzeScores = () => {
        const list: MindCareResult[] = [];
        const scales = detailedScores.scales;

        Object.entries(MIND_CARE_SCALES).forEach(([key, info]) => {
            // Check for key direct match or maybe slight variation if needed.
            // Try to find the score.
            const scoreData = scales[key];
            if (scoreData) {
                const tScore = typeof scoreData === 'number' ? scoreData : scoreData.t_score;
                if (tScore >= 65) {
                    list.push({
                        scale: key,
                        title: info.title,
                        subTitle: info.subTitle,
                        message: info.message,
                        tScore
                    });
                }
            }
        });

        setResults(list);
    };

    const warningCount = results.length;

    return (
        <div className="px-4">
            <div className={`bg-white border rounded-[2.5rem] transition-all duration-500 overflow-hidden ${isOpen
                ? 'p-8 lg:p-10 shadow-xl border-indigo-100 ring-1 ring-indigo-100'
                : 'p-4 shadow-sm border-slate-100 hover:shadow-md hover:border-slate-200'
                }`}>
                {/* Toggle Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between group outline-none"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${warningCount > 0
                            ? (isOpen ? 'bg-indigo-500 shadow-indigo-200' : 'bg-indigo-500 shadow-indigo-100')
                            : (isOpen ? 'bg-indigo-500 shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors')
                            }`}>
                            {warningCount > 0 ? <HeartPulse size={22} /> : <CheckCircle size={22} />}
                        </div>
                        <div className="text-left">
                            <h2 className={`text-xl font-black tracking-tight transition-colors ${warningCount > 0 ? 'text-indigo-900' : 'text-slate-700'
                                }`}>
                                마음의 날씨 리포트 (Mind Care)
                            </h2>
                            {!isOpen && (
                                <p className="text-sm font-medium text-slate-400 mt-1">
                                    {warningCount > 0
                                        ? <span className="text-indigo-600 font-bold">{warningCount}개의 마음 돌봄 신호가 감지되었습니다.</span>
                                        : "현재 마음 상태가 안정적입니다."}
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
                            <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-500 shadow-sm mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-indigo-900 mb-2">마음이 맑음입니다</h3>
                                <p className="text-indigo-700/80 font-medium max-w-md leading-relaxed">
                                    특별히 주의해야 할 마음의 날씨가 관측되지 않았습니다.<br />
                                    지금의 건강한 마음 상태를 잘 유지하세요.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-900 text-sm font-medium flex items-start gap-3">
                                    <HeartPulse size={18} className="shrink-0 mt-0.5" />
                                    <p>
                                        다음 항목들은 세심한 마음 돌봄이 필요한 영역입니다.
                                    </p>
                                </div>
                                {results.map((res, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-400"></div>
                                        <div className="mb-3">
                                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                {res.title}
                                            </h3>
                                            <p className="text-sm font-bold text-indigo-600 mt-1">"{res.subTitle}"</p>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed font-medium bg-slate-50/50 p-4 rounded-xl break-keep">
                                            {res.message}
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
                                리포트 닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
