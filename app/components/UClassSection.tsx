'use client';

import { AdminContent } from '@/app/admin/contents/actions';
import { PlayCircle, FileText, ArrowRight, ExternalLink, MoveRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function UClassSection({ contents }: { contents: AdminContent[] }) {
    if (!contents || contents.length === 0) return null;

    // Separate videos and articles
    const videoContent = contents.find(c => c.type === 'VIDEO');
    const articles = contents.filter(c => c.type === 'ARTICLE').slice(0, 4);

    // Helper to extract YouTube ID
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = videoContent ? getYouTubeId(videoContent.content_url) : null;

    return (
        <section className="mb-24">
            <div className="flex items-end justify-between mb-10 px-2">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 mb-3 tracking-tight">
                        U-Class <span className="text-indigo-600">.</span>
                    </h2>
                    <p className="text-slate-500 font-medium text-lg">
                        취업 전문가 멘토가 전하는 <span className="text-indigo-600 font-bold">합격 노하우</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Video Section (Left - 7 cols) */}
                {videoContent && (
                    <div className="lg:col-span-7 group">
                        <div className="bg-white rounded-[2rem] border border-slate-100 p-2 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500 overflow-hidden h-full flex flex-col">
                            {/* Video Embed */}
                            <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 w-full">
                                {videoId ? (
                                    <iframe
                                        className="w-full h-full"
                                        src={`https://www.youtube.com/embed/${videoId}`}
                                        title={videoContent.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white">
                                        <p>Invalid Video URL</p>
                                    </div>
                                )}
                            </div>

                            {/* Video Info */}
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full flex items-center gap-1">
                                        <PlayCircle size={12} fill="currentColor" className="text-red-600" />
                                        SPECIAL LECTURE
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(videoContent.created_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors leading-snug">
                                    {videoContent.title}
                                </h3>
                                <p className="text-slate-500 line-clamp-2 leading-relaxed">
                                    {videoContent.summary}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Article List Section (Right - 5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {articles.map((article, idx) => (
                        <Link
                            key={article.id}
                            href={`/u-class/${article.id}`}
                            className="group block bg-white rounded-3xl border border-slate-100 p-5 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Hover Effect Background */}
                            <div className="absolute inset-0 bg-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative z-10 flex gap-5 items-center">
                                {/* Thumbnail (Optional) */}
                                {article.thumbnail_url ? (
                                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex-shrink-0 relative overflow-hidden">
                                        <Image
                                            src={article.thumbnail_url}
                                            alt={article.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-400 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                                        <FileText size={24} />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded tracking-wide">
                                            INSIGHT
                                        </span>
                                        <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0" />
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-indigo-700 transition-colors">
                                        {article.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 text-ellipsis overflow-hidden">
                                        {article.summary || "내용을 확인해보세요."}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {articles.length === 0 && (
                        <div className="h-full bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center">
                            <span className="text-4xl mb-2">🤔</span>
                            <p className="text-slate-400 font-medium">아직 등록된 칼럼이 없어요.</p>
                        </div>
                    )}

                    {/* More Button (Optional, if we have an archive page later) */}
                    {/* <button className="w-full py-4 text-sm font-bold text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors">
            더 많은 아티클 보기 <MoveRight size={16} />
          </button> */}
                </div>
            </div>
        </section>
    );
}
