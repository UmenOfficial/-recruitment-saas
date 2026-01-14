'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, MapPin, Clock, ArrowRight, Loader2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface JobPosting {
    id: string;
    title: string;
    description: string;
    created_at: string;
    deadline: string | null;
    image_url?: string; // Add image_url
    site_config: {
        intro_type?: string;
        questions?: string[];
        bannerImage?: string; // Legacy support
        primaryColor?: string;
    } | null;
}

/**
 * 채용 공고 목록 페이지 (Grid Layout)
 */
export default function JobBoard() {
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchJobs() {
            const { data, error } = await supabase
                .from('postings')
                .select('id, title, description, created_at, deadline, site_config, image_url') // Select image_url
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) console.error('Error loading jobs:', error);
            setJobs(data as any || []); // Cast for site_config JSONB typing
            setLoading(false);
        }
        fetchJobs();
    }, []);

    // Helper to calculate days remaining
    const getDaysRemaining = (deadline: string | null) => {
        if (!deadline) return null;
        const diff = new Date(deadline).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? `D-${days}` : '마감임박';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 shrink-0">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl tracking-tight text-slate-900">
                        MEETUP<span className="text-blue-600">Careers</span>
                    </div>
                    <Link href="/test/login" className="text-sm font-medium text-slate-500 hover:text-blue-600">
                        이미 지원하셨나요? 테스트 응시하기
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
                <div className="text-center mb-16">
                    <h1 className="text-3xl font-bold text-slate-900 mb-3">MEETUP과 함께 성장하세요</h1>
                    <p className="text-slate-500 text-lg">채용의 미래를 함께 만들어갈 열정적인 인재를 찾습니다.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Briefcase className="mx-auto text-slate-300 mb-3" size={48} />
                        <p className="text-slate-500 font-medium">현재 진행 중인 공고가 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {jobs.map(job => {
                            const dDay = getDaysRemaining(job.deadline);
                            const bannerImg = job.image_url || job.site_config?.bannerImage;

                            return (
                                <Link
                                    href={`/jobs/${job.id}/apply`}
                                    key={job.id}
                                    className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                                >
                                    {/* Image Section (Square-ish Aspect) */}
                                    <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
                                        {bannerImg ? (
                                            <img
                                                src={bannerImg}
                                                alt={job.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-blue-50 group-hover:to-blue-100 transition-colors">
                                                <Briefcase className="text-slate-300 w-16 h-16 group-hover:text-blue-300 transition-colors" />
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            {dDay && (
                                                <span className="bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                                    {dDay}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                                {job.title}
                                            </h3>
                                            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                                                <span className="flex items-center gap-1"><MapPin size={14} /> 서울/원격</span>
                                                <span className="flex items-center gap-1"><Clock size={14} /> 정규직</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                                            <span className="text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                지원하기 <ArrowRight size={14} />
                                            </span>
                                            {job.created_at && (
                                                <span className="text-xs text-slate-400">
                                                    {new Date(job.created_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Footer */}
            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-6 mt-10 text-sm">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p>&copy; 2024 MEETUP Careers. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
