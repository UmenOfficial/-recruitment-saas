'use client';

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ApplicationSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div
                className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700"
            >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    지원서가 제출되었습니다!
                </h1>

                <p className="text-slate-500 mb-8 leading-relaxed">
                    귀하의 소중한 지원서가 성공적으로 접수되었습니다.<br />
                    서류 검토 후 합격자에 한해 개별적으로 연락드릴 예정입니다.
                </p>

                <div className="space-y-3">
                    <Link href="/jobs" className="block w-full">
                        <Button variant="outline" className="w-full text-black border-slate-300 hover:bg-slate-100" size="lg">
                            다른 공고 확인하기 <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>

                    <Link href="/" className="block w-full">
                        <Button variant="ghost" className="w-full text-slate-500">
                            메인으로 돌아가기
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
