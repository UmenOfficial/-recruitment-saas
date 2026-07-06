'use client';

import { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

export default function AptitudeInterpretationGuide() {
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
                            {!isOpen && <p className="text-xs text-slate-400 font-bold mt-0.5">점수와 정답률의 의미를 확인해 보세요.</p>}
                        </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-100 text-slate-400 transition-all duration-500 ${isOpen ? 'rotate-180 bg-blue-50 border-blue-100 text-blue-600' : 'group-hover:border-blue-200 group-hover:text-blue-500'}`}>
                        <ChevronDown size={20} />
                    </div>
                </button>

                {/* Collapsible Content */}
                <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-10' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                        <div className="bg-white/50 p-8 rounded-[1.5rem] border border-blue-50/50 text-center">
                            <p className="text-slate-500 font-medium">
                                추후 적성검사 결과 해석을 위한 상세 가이드가 업데이트될 예정입니다.
                            </p>
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
