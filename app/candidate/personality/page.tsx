import { createClient } from "@/lib/supabase/server";
import NextImage from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function PersonalityTestsPage() {
    const supabase = await createClient();

    // 세션 확인 (미들웨어가 처리하겠지만 한 번 더 안전하게)
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login?next=/candidate/personality");
    }

    // ACTIVE 상태의 인성검사 목록 조회
    const { data: tests } = await supabase
        .from("tests")
        .select("*")
        .eq("type", "PERSONALITY")
        .eq("status", "ACTIVE")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

    // 진행 중인 검사 확인 (이어하기 기능을 위해)
    const { data: ongoingResults } = await supabase
        .from("test_results")
        .select("test_id")
        .eq("user_id", session.user.id)
        .is("completed_at", null);

    const ongoingTestIds = new Set(ongoingResults?.map(r => r.test_id));

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-2 mb-8">
                <Link href="/" className="text-slate-500 hover:text-slate-900 flex items-center gap-2">
                    <ArrowLeft size={20} />
                    Home으로 돌아가기
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold mb-2">인성검사 목록</h1>
                <p className="text-slate-500">
                    현재 응시 가능한 인성검사입니다.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests && tests.length > 0 ? (
                    tests.map((test) => {
                        const isOngoing = ongoingTestIds.has(test.id);
                        const href = isOngoing
                            ? `/candidate/personality/${test.id}/test`
                            : `/candidate/personality/${test.id}/guide`;

                        return (
                            <Link
                                key={test.id}
                                href={href}
                                className={`group block bg-white border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 h-full flex flex-col justify-between min-h-[320px] ${isOngoing ? 'border-blue-200 ring-1 ring-blue-200' : 'border-slate-200'
                                    }`}
                            >
                                <div className="relative w-full h-40 bg-slate-100">
                                    <NextImage
                                        src={(test as any).image_url || '/images/sample-personality.png'}
                                        alt={test.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg mb-1 group-hover:text-orange-600 transition-colors">{test.title}</h3>
                                            <p className="text-sm text-slate-500 whitespace-pre-line">{test.description || '설명이 없습니다.'}</p>
                                        </div>
                                        <span className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded-md font-medium shrink-0 ml-2">Active</span>
                                    </div>
                                    <div className="flex items-center text-sm font-medium text-slate-400 group-hover:text-slate-900 transition-colors mt-auto">
                                        {isOngoing ? (
                                            <span className="text-blue-600 font-bold flex items-center">
                                                이어하기 <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                검사 시작하기 <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 text-slate-400">
                        진행 중인 인성검사가 없습니다.
                    </div>
                )}
            </div >
        </div >
    );
}
