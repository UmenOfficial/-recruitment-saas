'use client';

import { useEffect, useState } from 'react';

export default function InAppBrowserCheck() {
    const [isInApp, setIsInApp] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        // Common In-App Browsers in Korea + Global
        const inAppKeywords = [
            'kakao', // KakaoTalk
            'naver', // Naver App
            'instagram',
            'facebook',
            'snapchat',
            'line',
            'everytimeapp'
        ];

        const isDetected = inAppKeywords.some(keyword => userAgent.includes(keyword));
        setIsInApp(isDetected);

        // Auto-redirect for Android (Chrome Intent)
        if (isDetected && /android/.test(userAgent)) {
            const currentUrl = window.location.href.replace(/https?:\/\//, '');
            // Attempt to open in Chrome via Intent
            // location.href = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
            // Using generic browser intent might be safer or fallback
        }
    }, []);

    if (!isInApp) return null;

    const copyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('주소가 복사되었습니다. 브라우저 주소창에 붙여넣기 해주세요.');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
                <div className="text-4xl">⚠️</div>
                <h2 className="text-xl font-bold text-slate-800">
                    외부 브라우저에서<br />열어주세요
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                    현재 브라우저에서는<br />
                    구글 로그인이 제한될 수 있습니다.<br />
                    <br />
                    <span className="font-semibold text-indigo-600">Safari</span> 또는 <span className="font-semibold text-indigo-600">Chrome</span> 등<br />
                    시스템 브라우저로 접속해주세요.
                </p>

                <div className="pt-2 space-y-2">
                    <button
                        onClick={copyUrl}
                        className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <span>🔗 주소 복사하기</span>
                    </button>

                    {/* iOS Hint */}
                    <div className="text-xs text-slate-400 pt-2">
                        화면 상단/하단의 <span className="inline-block px-1 border rounded">...</span> 또는 <span className="inline-block px-1 border rounded">공유</span> 버튼을 눌러<br />
                        [브라우저로 열기]를 선택하세요.
                    </div>
                </div>
            </div>
        </div>
    );
}
