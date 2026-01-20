'use client';

import { useState, useEffect } from 'react';
import { debugRLS } from './actions';

export default function RLSDebugPage() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runDebug = async () => {
        setLoading(true);
        try {
            const res = await debugRLS();
            setResult(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">RLS Debug Tool (Candidate)</h1>
            <p className="text-slate-500">
                이 페이지는 데이터베이스 권한 문제(RLS)를 진단하기 위한 도구입니다.
                <br />
                '진단 시작' 버튼을 누르면 현재 로그인된 사용자의 실제 데이터와 조회 가능한 데이터를 비교합니다.
            </p>

            <button
                onClick={runDebug}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                {loading ? '진단 중...' : '진단 시작 (Check RLS)'}
            </button>

            {result && (
                <div className="space-y-6">
                    {/* Diagnosis Result */}
                    <div className={`p-6 rounded-2xl border-2 ${result.success && result.rls?.count === result.db?.count
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                        }`}>
                        <h3 className="font-bold text-lg mb-2">진단 결과</h3>
                        <p className="font-mono text-sm whitespace-pre-wrap">
                            {result.diagnosis}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* RLS View */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-600 mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                RLS 적용 조회 (Visible)
                            </h4>
                            <div className="space-y-2 font-mono text-sm">
                                <p>Count: <strong className="text-xl">{result.rls?.count ?? 'Error'}</strong></p>
                                <p className="text-slate-400">사용자가 실제 볼 수 있는 데이터</p>
                                {result.rls?.error && (
                                    <p className="text-red-500 bg-red-50 p-2 rounded">{JSON.stringify(result.rls.error)}</p>
                                )}
                            </div>
                        </div>

                        {/* DB View */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-600 mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-slate-800"></span>
                                실제 DB 데이터 (Actual)
                            </h4>
                            <div className="space-y-2 font-mono text-sm">
                                <p>Count: <strong className="text-xl">{result.db?.count ?? 'Error'}</strong></p>
                                <p className="text-slate-400">관리자 권한으로 확인한 실제 데이터</p>
                                {result.db?.error && (
                                    <p className="text-red-500 bg-red-50 p-2 rounded">{JSON.stringify(result.db.error)}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="bg-slate-50 p-6 rounded-2xl text-xs font-mono text-slate-500 overflow-x-auto">
                        <p>User ID: {result.user?.id}</p>
                        <p>Role: {result.user?.role}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
