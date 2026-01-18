'use client';

import { useEffect, useState } from 'react';
export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase/global-client';
import { Users, FileText, Briefcase, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardStats {
    totalCandidates: number;
    aptitudeCount: number;
    personalityCount: number;
    activePostings: number;
    totalVisits: number;
    recentApps: any[];
}

interface DailyVisitData {
    date: string;
    loggedIn: number;
    notLoggedIn: number;
}

/**
 * 관리자 대시보드 페이지
 * 
 * 시스템의 주요 현황(지원자 수, 공고 수, 질문 수)과
 * 최근 지원자 활동 내역을 한눈에 보여줍니다.
 */
import { fetchDashboardStats, fetchRecentAppsAction } from './actions';

// ... (imports remain)

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalCandidates: 0,
        aptitudeCount: 0,
        personalityCount: 0,
        activePostings: 0,
        totalVisits: 0,
        recentApps: []
    });
    const [loading, setLoading] = useState(true);
    const [recentAppsPage, setRecentAppsPage] = useState(1);
    const [hasMoreApps, setHasMoreApps] = useState(false);
    const ITEMS_PER_PAGE = 10;

    const [dailyVisits, setDailyVisits] = useState<DailyVisitData[]>([]);

    useEffect(() => {
        async function loadStats() {
            try {
                const result = await fetchDashboardStats();

                if (!result.success || !result.data) {
                    throw new Error(result.error);
                }

                const data = result.data;

                // Process daily visits
                const visitsByDate: Record<string, { loggedIn: number, notLoggedIn: number }> = {};
                for (let i = 0; i < 14; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const isoKey = d.toISOString().split('T')[0];
                    visitsByDate[isoKey] = { loggedIn: 0, notLoggedIn: 0 };
                }

                data.visitedLogs?.forEach((log: any) => {
                    const date = new Date(log.timestamp);
                    const isoKey = date.toISOString().split('T')[0];
                    if (visitsByDate[isoKey]) {
                        if (log.actor_id) {
                            visitsByDate[isoKey].loggedIn += 1;
                        } else {
                            visitsByDate[isoKey].notLoggedIn += 1;
                        }
                    }
                });

                const chartData = Object.entries(visitsByDate)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([dateIso, counts]) => {
                        const [year, month, day] = dateIso.split('-');
                        return {
                            date: `${month}-${day}`,
                            loggedIn: counts.loggedIn,
                            notLoggedIn: counts.notLoggedIn
                        };
                    });

                setStats({
                    totalCandidates: data.candidatesCount,
                    aptitudeCount: data.aptitudeCount,
                    personalityCount: data.personalityCount,
                    activePostings: data.postingsCount,
                    recentApps: data.recentApps,
                    totalVisits: data.allTimeVisits
                });
                setDailyVisits(chartData);

                if (data.recentApps && data.recentApps.length === ITEMS_PER_PAGE) {
                    setHasMoreApps(true);
                } else {
                    setHasMoreApps(false);
                }

            } catch (error) {
                console.error('대시보드 통계 로딩 실패:', error);
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, []);

    const handlePageChange = async (newPage: number) => {
        setLoading(true);
        const result = await fetchRecentAppsAction(newPage);

        if (result.success && result.data) {
            setStats(prev => ({ ...prev, recentApps: result.data }));
            setRecentAppsPage(newPage);
            setHasMoreApps(result.data.length === ITEMS_PER_PAGE);
        } else {
            console.error(result.error);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
                    <div className="h-32 w-full max-w-2xl bg-slate-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">대시보드 개요</h1>
                <p className="text-slate-500">관리자님, 환영합니다.</p>
            </div>

            {/* 통계 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    title="총 방문 수"
                    value={stats.totalVisits.toLocaleString()}
                    icon={<Users size={24} className="text-orange-600" />}
                    trend="홈페이지 접속"
                    color="bg-orange-50"
                />
                <StatsCard
                    title="총 지원자 수"
                    value={stats.totalCandidates}
                    icon={<Users size={24} className="text-blue-600" />}
                    trend="전체 지원자"
                    color="bg-blue-50"
                />
                {/* <StatsCard
                    title="진행 중인 공고"
                    value={stats.activePostings}
                    icon={<Briefcase size={24} className="text-purple-600" />}
                    trend="현재 활성화됨"
                    color="bg-purple-50"
                /> */}
                <StatsCard
                    title="인성검사 문항"
                    value={stats.personalityCount}
                    icon={<FileText size={24} className="text-indigo-600" />}
                    trend="등록된 문제 수"
                    color="bg-indigo-50"
                />
            </div>

            {/* 방문자 통계 차트 */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={18} className="text-slate-400" />
                    일별 방문자 현황 (최근 14일)
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyVisits}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f1f5f9' }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="rect"
                            />
                            <Bar dataKey="loggedIn" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} name="로그인 방문자" />
                            <Bar dataKey="notLoggedIn" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={30} name="비로그인 방문자" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 최근 활동 */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-slate-400" />
                            최근 지원 현황
                        </h3>
                        <Link href="/admin/candidates" className="text-sm text-blue-600 hover:underline">
                            전체 보기
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {stats.recentApps.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">최근 활동 내역이 없습니다.</p>
                        ) : (
                            stats.recentApps.map((app) => (
                                <div key={app.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                            {(app.name || app.users?.full_name || 'NA').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{app.name || app.users?.full_name || '이름 없음'}</p>
                                            <p className="text-xs text-slate-500">
                                                <span className="font-medium text-slate-600">{app.postings?.title}</span>
                                                <span className="mx-1 text-slate-300">|</span>
                                                {new Date(app.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={app.status} />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
                        <button
                            onClick={() => handlePageChange(recentAppsPage - 1)}
                            disabled={recentAppsPage === 1}
                            className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            이전
                        </button>
                        <span className="text-sm text-slate-500">
                            Page {recentAppsPage}
                        </span>
                        <button
                            onClick={() => handlePageChange(recentAppsPage + 1)}
                            disabled={!hasMoreApps}
                            className="px-3 py-1 text-sm font-medium text-slate-600 bg-white border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            다음
                        </button>
                    </div>
                </div>

                {/* 빠른 작업 */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-slate-400" />
                        빠른작업
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/admin/questions" className="block p-4 border rounded-xl hover:shadow-md transition-all hover:border-blue-200 group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">문제 관리</h4>
                                    <p className="text-sm text-slate-500">새 문제를 추가하거나 엑셀로 업로드합니다.</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/admin/candidates" className="block p-4 border rounded-xl hover:shadow-md transition-all hover:border-purple-200 group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">지원자 평가</h4>
                                    <p className="text-sm text-slate-500">지원자를 검토하고 게스트 평가자를 초대합니다.</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div >
    );
}

function StatsCard({ title, value, icon, trend, color }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <TrendingUp size={12} />
                {trend}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        'APPLIED': 'bg-slate-100 text-slate-600',
        'TEST_COMPLETED': 'bg-blue-50 text-blue-700',
        'PASS': 'bg-green-50 text-green-700',
        'FAIL': 'bg-red-50 text-red-700',
        'HIRED': 'bg-emerald-100 text-emerald-800', // Added HIRED style
        'REJECTED': 'bg-red-100 text-red-800'
    } as any;

    const labels = {
        'APPLIED': '지원완료',
        'TEST_COMPLETED': '시험완료',
        'PASS': '합격',
        'FAIL': '불합격',
        'HIRED': '최종합격', // Added HIRED label
        'REJECTED': '탈락'
    } as any;

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent ${styles[status] || styles['APPLIED']}`}>
            {labels[status] || status}
        </span>
    );
}
