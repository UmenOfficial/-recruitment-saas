import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function PersonalityGuidePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: testData } = await supabase
        .from('tests')
        .select('time_limit')
        .eq('id', id)
        .single();

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <Link href="/candidate/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-4">
                    <ArrowLeft size={20} />
                    대시보드로 돌아가기
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">인성검사 유의사항</h1>
                <p className="text-slate-500 mt-2">검사 시작 전 아래 유의사항을 반드시 확인해 주세요.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">

                <div className="space-y-16">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">제한 시간 안내</h3>
                            <p className="text-slate-600 mt-1">
                                본 검사는 총 <strong>{(testData as any)?.time_limit || 30}분</strong> 동안 진행됩니다.<br />
                                시간 내에 모든 문항에 응답해야 합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">솔직한 응답</h3>
                            <p className="text-slate-600 mt-1">
                                정답이 없는 검사입니다. 평소 자신의 생각과 행동에 가장 가까운 것을 선택해 주세요.<br />
                                지나치게 좋게 보이려고 하면 <strong>무효 처리</strong>될 수 있습니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">주의사항</h3>
                            <p className="text-slate-600 mt-1">
                                검사 도중 브라우저를 닫거나 뒤로 가기를 누르면 응답이 저장되지 않을 수 있습니다.<br />
                                안정적인 네트워크 환경에서 응시해 주세요.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-center">
                    <Link
                        href={`/candidate/personality/${id}/practice`}
                        className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
                    >
                        연습문제 풀기 <ArrowRight size={20} />
                    </Link>
                </div>

            </div>
        </div>
    );
}
