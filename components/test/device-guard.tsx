"use client";

import { isMobile } from "react-device-detect";
import { useEffect, useState } from "react";
import { Monitor, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface TestConfig {
    use_aptitude: boolean;
    use_personality: boolean;
}

interface DeviceGuardProps {
    config: TestConfig;
    children: React.ReactNode;
}

export function DeviceGuard({ config, children }: DeviceGuardProps) {
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);

    // Hydration fix
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsClient(true);
    }, []);

    if (!isClient) return null; // or a loading spinner

    // Logic: If Aptitude is enabled (use_aptitude), FORCE PC.
    // Webcams and screen sharing are unstable on mobile browsers.
    const requiresPC = config.use_aptitude;

    if (requiresPC && isMobile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Monitor className="text-red-600 w-8 h-8" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-3">
                        PC 환경에서 접속해주세요
                    </h2>

                    <p className="text-slate-600 mb-6 leading-relaxed">
                        이 시험은 <strong>역량검사(적성)</strong>가 포함되어 있어,<br />
                        부정행위 방지를 위해 웹캠 및 화면 공유 기능이 필수입니다.<br />
                        안정적인 응시를 위해 PC(Chrome 브라우저)로 접속해주세요.
                    </p>

                    <div className="flex justify-center gap-4 text-sm text-slate-500 mb-8 bg-slate-50 p-4 rounded-lg">
                        <div className="flex flex-col items-center">
                            <Monitor className="mb-2 text-green-600" />
                            <span className="font-semibold text-green-700">PC 접속</span>
                            <span className="text-xs">권장 환경</span>
                        </div>
                        <div className="w-px bg-slate-200 h-10 self-center"></div>
                        <div className="flex flex-col items-center opacity-50">
                            <Smartphone className="mb-2" />
                            <span>모바일</span>
                            <span className="text-xs">지원 불가</span>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push('/dashboard')}
                        variant="outline"
                        className="w-full"
                    >
                        대시보드로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    // If config allows mobile (only personality) OR user is on PC, render content
    return <>{children}</>;
}
