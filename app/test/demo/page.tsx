'use client';

import { useRouter } from 'next/navigation';
import { Shield, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useTestStore } from '@/lib/store/test-session';

// ... imports ...

/**
 * 테스트 안내 및 데모 인트로 페이지
 * 
 * 본격적인 테스트 시작 전, 규칙과 주의사항을 안내합니다.
 * '테스트 시작' 버튼 클릭 시 Test Room으로 이동합니다.
 */
export default function DemoIntakePage() {
    const router = useRouter();
    const { initSession } = useTestStore();

    const handleStart = () => {
        // 실제 앱에서는 특정 Test ID를 fetch 해와야 함
        // 데모이므로 바로 Test Room으로 이동하여 Mock Data 로드
        router.push('/test/room');
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-8 text-white text-center">
                    <h1 className="text-2xl font-bold mb-2">기술 역량 평가 (데모)</h1>
                    <p className="text-slate-400">소프트웨어 엔지니어 - 프론트엔드 포지션</p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">평가 규칙 및 주의사항</h3>

                        <RuleItem
                            icon={<Clock className="text-blue-500" />}
                            title="제한 시간: 30분"
                            desc="시작 버튼을 누르면 즉시 타이머가 작동합니다. 시간이 종료되면 답안이 자동 제출됩니다."
                        />

                        <RuleItem
                            icon={<Shield className="text-green-500" />}
                            title="안전한 환경"
                            desc="응시 환경은 실시간으로 모니터링됩니다. 안정적인 인터넷 연결을 유지해주세요."
                        />

                        <RuleItem
                            icon={<AlertTriangle className="text-amber-500" />}
                            title="부정행위 방지 시스템"
                            desc="화면 이탈, 탭 전환 시 경고가 발생합니다. 3회 이상 경고 누적 시 시험이 강제 종료됩니다."
                        />
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 word-keep-all">
                        <strong>알림:</strong> 본 테스트는 데모 버전입니다. 실제 채용 결과에는 반영되지 않습니다.
                        실제 지원 시에는 이메일로 발송된 안내를 따라주세요.
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-0.5"
                    >
                        문제 풀기 시작 <ArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
}

function RuleItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1">{icon}</div>
            <div>
                <p className="font-medium text-slate-900">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
