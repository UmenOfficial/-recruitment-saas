import { createClient } from "@/lib/supabase/server";
import NextImage from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AptitudeTestsPage() {
    const supabase = await createClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login?next=/candidate/aptitude");
    }

    // ACTIVE 상태의 적성검사 목록 조회
    const { data: tests } = await supabase
        .from("tests")
        .select("*")
        .eq("type", "APTITUDE")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-2 mb-8">
                <Link href="/candidate/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center gap-2">
                    <ArrowLeft size={20} />
                    대시보드
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold mb-2">적성검사 목록</h1>
                <p className="text-slate-500">
                    현재 응시 가능한 적성검사입니다.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests && tests.length > 0 ? (
                    tests.map((test) => (
                        <Link
                            key={test.id}
                            href={`/candidate/aptitude/${test.id}/guide`}
                            className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1 h-full flex flex-col justify-between min-h-[320px]"
                        >
                            <div className="relative w-full h-40 bg-slate-100">
                                {/* 적성검사용 이미지가 따로 있다면 변경 가능, 현재는 샘플 공유 */}
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
                                        <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">{test.title}</h3>
                                        <p className="text-sm text-slate-500 whitespace-pre-line">{test.description || '설명이 없습니다.'}</p>
                                    </div>
                                    <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md font-medium shrink-0 ml-2">Active</span>
                                </div>
                                <div className="flex items-center text-sm font-medium text-slate-400 group-hover:text-slate-900 transition-colors mt-auto">
                                    검사 시작하기 <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 text-slate-400">
                        진행 중인 적성검사가 없습니다.
                    </div>
                )}
            </div >
        </div >
    );
}
