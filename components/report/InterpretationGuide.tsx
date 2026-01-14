'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, TrendingUp, RefreshCw } from 'lucide-react';

export default function InterpretationGuide() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="px-4">
            <div className={`bg-gradient-to-br from-blue-50/40 to-indigo-50/40 border border-blue-100/60 rounded-[2.5rem] transition-all duration-500 overflow-hidden ${isOpen ? 'p-8 lg:p-10 shadow-lg shadow-blue-100/30' : 'p-4 shadow-sm hover:shadow-md'}`}>
                {/* Toggle Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between group outline-none"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${isOpen ? 'bg-blue-500 shadow-blue-200' : 'bg-slate-400 group-hover:bg-blue-400 shadow-slate-100'}`}>
                            <Info size={22} className={`${isOpen ? 'rotate-0' : 'rotate-12'} transition-transform duration-500`} />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-black text-slate-600 tracking-tight">해석 시 참고사항</h2>
                            {!isOpen && <p className="text-xs text-slate-400 font-bold mt-0.5">T-점수와 상위 %의 의미를 확인해 보세요.</p>}
                        </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-100 text-slate-400 transition-all duration-500 ${isOpen ? 'rotate-180 bg-blue-50 border-blue-100 text-blue-600' : 'group-hover:border-blue-200 group-hover:text-blue-500'}`}>
                        <ChevronDown size={20} />
                    </div>
                </button>

                {/* Collapsible Content */}
                <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-10' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 relative items-stretch">
                            {/* Vertical Divider (Desktop only) */}
                            <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-blue-200/50 -translate-x-1/2"></div>

                            <div className="flex flex-col gap-4 relative">
                                <h3 className="font-bold text-blue-700 flex items-center gap-2 text-lg shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-sm"></div>
                                    T-점수란 무엇인가요?
                                </h3>
                                <div className="flex-1 text-slate-600 text-[14px] leading-relaxed font-medium bg-white/50 p-8 rounded-[1.5rem] border border-blue-50/50 flex flex-col justify-center break-keep">
                                    <p>
                                        단순히 '몇 점'을 맞았는지가 아니라, <span className="text-slate-900 font-bold underline underline-offset-4 decoration-blue-200">다른 사람들과 비교했을 때 나의 상대적 위치</span>가 어디인지를 알려주는 점수입니다.
                                    </p>
                                    <div className="mt-6 pt-6 border-t border-blue-100/30">
                                        평균을 50점으로 두고<span className="bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm shadow-blue-200">50점보다 높으면 평균보다 우수</span>하고, 낮으면 평균보다 다소 낮은 상태임을 의미합니다. 대부분의 응시자는 40~60점 사이의 점수를 받게 됩니다.
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 relative">
                                <h3 className="font-bold text-indigo-700 flex items-center gap-2 text-lg shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-sm"></div>
                                    상위 %는 어떻게 해석하나요?
                                </h3>
                                <div className="flex-1 text-slate-600 text-[14px] leading-relaxed font-medium bg-white/50 p-8 rounded-[1.5rem] border border-indigo-50/50 flex flex-col justify-center break-keep">
                                    <p>
                                        나보다 높은 점수를 받은 사람이 몇 명인지를 전체 비율(%)로 나타낸 것입니다.
                                    </p>
                                    <div className="mt-6 pt-6 border-t border-indigo-100/30">
                                        예를 들어 '상위 10%'라면, <span className="text-slate-900 font-bold underline underline-offset-4 decoration-indigo-200">"한 반에 100명이 있다면 내가 10등"</span> 이라는 의미이며 숫자가 <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm shadow-indigo-200">작을수록 해당 역량이 더 탁월함</span>을 의미합니다.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Hint */}
                        <div className="mt-10 flex justify-center">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-bold text-blue-400 hover:text-blue-600 transition-colors py-2 px-4 rounded-full bg-blue-50/30 hover:bg-blue-50"
                            >
                                해석 참고사항 숨기기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
