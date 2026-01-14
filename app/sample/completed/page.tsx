'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, Unlock, FileBarChart } from 'lucide-react';

export default function SampleCompletedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Header Graphic */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 filter contrast-125 brightness-100"></div>

                    <div className="relative z-10 w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-white/20">
                        <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
                    </div>

                    <h1 className="relative z-10 text-3xl font-bold text-white mb-2">
                        체험이 완료되었습니다!
                    </h1>
                    <p className="relative z-10 text-blue-100 font-medium">
                        응답해주셔서 감사합니다.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="text-slate-600 text-center mb-10 leading-relaxed font-medium">
                        방금 진행하신 20문항은 샘플 테스트로,<br />
                        <span className="text-slate-800 font-bold">상세한 분석 결과(T점수, 역량 등)</span>는 제공되지 않습니다.<br /><br />
                        나의 진짜 모습이 궁금하다면,<br />
                        지금 바로 로그인하고 <span className="text-blue-600 font-bold">정식 리포트</span>를 확인해보세요.
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                            <FileBarChart className="mx-auto mb-2 text-slate-400" size={24} />
                            <div className="text-xs text-slate-500 font-bold">상세 리포트</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                            <Unlock className="mx-auto mb-2 text-slate-400" size={24} />
                            <div className="text-xs text-slate-500 font-bold">전체 항목 분석</div>
                        </div>
                    </div>

                    <Link
                        href="/login?redirect_from=sample"
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-slate-200"
                    >
                        로그인하고 정식 리포트 받기
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <div className="text-center mt-6">
                        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 font-medium underline underline-offset-4">
                            메인으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
