'use client';

import Link from "next/link";
import { MessageSquare, Scale, BrainCircuit, Link as LinkIcon, ArrowRight } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import LandingHeader from "@/components/layout/LandingHeader";
import UClassSection from "@/app/components/UClassSection";
import { AdminContent } from "@/app/admin/contents/actions";
import PreRegisterModal from "@/components/modal/PreRegisterModal";
import { useState, useRef } from "react";
import { trackVisit } from "@/app/actions/tracking";

export function UTalkLounge({ posts }: { posts: any[] }) {
    // if (posts.length === 0) return null; // Always show to potential users

    return (
        <section className="mb-24">
            <div className="flex justify-between items-end mb-8 px-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">U-Talk Lounge</h2>
                    <p className="text-slate-500 font-medium">취업, 고민, 그리고 우리들의 이야기</p>
                </div>
                <Link href="/community" className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                    전체보기 <ArrowRight size={16} />
                </Link>
            </div>

            {posts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-12 text-center">
                    <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">아직 등록된 이야기가 없어요</h3>
                    <p className="text-slate-500 mb-6">첫 번째 이야기의 주인공이 되어보세요!</p>
                    <Link href="/community/write" className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors">
                        이야기 시작하기
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <Link key={post.id} href={`/community/${post.id}`} className="block group">
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all h-full flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${post.category === 'FREE' ? 'bg-slate-100 text-slate-600' :
                                        post.category === 'QNA' ? 'bg-orange-100 text-orange-600' :
                                            post.category === 'REVIEW' ? 'bg-green-100 text-green-600' :
                                                'bg-primary/10 text-primary'
                                        }`}>
                                        {post.category}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(post.created_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                                    {post.content}
                                </p>
                                <div className="flex items-center gap-3 text-xs font-medium text-slate-400 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare size={14} />
                                        댓글 {post.comment_count}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        조회 {post.view_count}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>);
}

export default function HomePageContent({ initialPosts, uClassContents }: { initialPosts: any[], uClassContents: AdminContent[] }) {
    const [isPreRegisterOpen, setIsPreRegisterOpen] = useState(false);
    const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

    useEffect(() => {
        // Initial fetch
        fetch('/api/waitlist')
            .then(res => res.json())
            .then(data => {
                if (typeof data.count === 'number') {
                    setWaitlistCount(data.count);
                }
            })
            .catch(console.error);

        // Track Visit (Once per session)
        const hasVisited = sessionStorage.getItem('umen_visit_logged');
        if (!hasVisited) {
            trackVisit();
            sessionStorage.setItem('umen_visit_logged', 'true');
        }
    }, []);

    // ... existing login toast useEffect ...

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/20 selection:text-slate-900">

            <PreRegisterModal
                isOpen={isPreRegisterOpen}
                onClose={() => {
                    setIsPreRegisterOpen(false);
                    // Refresh count
                    fetch('/api/waitlist')
                        .then(res => res.json())
                        .then(data => setWaitlistCount(data.count))
                        .catch(console.error);
                }}
            />

            {/* Navigation */}
            <LandingHeader />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-24">

                {/* Hero Section (Slogan) */}
                <section className="flex flex-col items-center text-center mb-24 pt-12 relative">
                    {/* Pastel Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-gradient-to-br from-primary/30 via-purple-200 to-orange-200 rounded-full blur-[80px] opacity-40 -z-10"></div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-600 leading-tight">
                        Find the <span className="text-primary drop-shadow-sm">&apos;U&apos;</span><br />
                        in Unique.
                    </h1>
                    <p className="mt-6 text-xl text-slate-500 font-medium max-w-2xl">
                        평범함 속에서 당신만의 특별함을 찾으세요.
                    </p>

                    {/* Pre-register Button */}
                    {/* Pre-register Button - Removed */}
                </section>

                {/* Services Grid (Bento Grid Layout) */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)] mb-24">

                    {/* Card 1: Personality */}
                    <Link href="/candidate/personality" className="group relative bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden flex flex-col justify-start gap-24 cursor-pointer">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Scale size={32} strokeWidth={2.5} />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">인성검사:<br />나를 만나는 시간</h3>
                            <p className="text-slate-500 leading-relaxed font-medium">
                                당신다운 솔직함에 가장 큰 무기입니다.<br />
                                흔들리지 않게 중심을 잡아드릴게요.
                            </p>
                        </div>
                    </Link>

                    {/* Card 2: Aptitude */}
                    <Link href="/candidate/aptitude" className="group relative bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 overflow-hidden flex flex-col justify-start gap-24 cursor-pointer">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                            <BrainCircuit size={32} strokeWidth={2.5} />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">적성검사:<br />숨겨진 능력 깨우기</h3>
                            <p className="text-slate-500 leading-relaxed font-medium">
                                당신의 잠재력을 믿으세요.<br />
                                낯선 문제 앞에서도 당황하지 않도록 준비해드릴게요.
                            </p>
                        </div>
                    </Link>

                    {/* Card 3: Interview */}
                    {/* Card 3: Interview (Disabled) */}
                    <div className="group relative bg-slate-50 border border-slate-100 rounded-[2rem] p-10 overflow-hidden flex flex-col justify-start gap-24 cursor-not-allowed opacity-80">
                        <div className="absolute top-6 right-6 bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                            오픈 준비 중
                        </div>

                        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                            <LinkIcon size={32} strokeWidth={2.5} />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold mb-3 text-slate-400">면접:<br />경험의 재발견</h3>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                사소하다고 생각했던 당신의 모든 경험이<br />
                                정답이 됩니다.
                            </p>
                        </div>
                    </div>

                </section>



                {/* U-Class Section (Mentor's Pick) */}
                <UClassSection contents={uClassContents} />

                {/* U-Talk Lounge Section */}
                <UTalkLounge posts={initialPosts} />

            </main>

            {/* Footer */}
            <footer className="w-full py-10 border-t border-slate-100 bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <div className="text-sm font-bold text-slate-500 mb-1">
                            Sincerely, your mentor.
                        </div>
                        <p className="text-xs text-slate-400">
                            본 서비스는 <span className="font-semibold text-slate-500">T-Score 표준 점수</span> 기반의 정밀 성향 분석을 제공합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* GitHub Link */}
                        <a
                            href="https://github.com/UmenOfficial/-recruitment-saas"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white px-3 py-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"></path>
                            </svg>
                            Open Source
                        </a>

                        <div className="text-xs text-slate-300">
                            © U.men.
                        </div>
                    </div>
                </div>
            </footer>

            {/* Floating Action Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <Link href="/community/write">
                    <button className="w-14 h-14 bg-primary rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform hover:bg-primary/90 hover:text-white group">
                        <MessageSquare size={24} className="group-hover:animate-pulse" />
                    </button>
                </Link>
            </div>

        </div>
    );
}
