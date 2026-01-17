import { createServerSupabaseClient } from '@/lib/supabase/server';
import LandingHeader from '@/components/layout/LandingHeader';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CommentSection from '../CommentSection';
import { getComments } from '../actions';

// Generate Metadata
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: post } = await (await supabase)
        .from('admin_contents')
        .select('title, summary')
        .eq('id', id)
        .single();

    if (!post) {
        return {
            title: 'Content Not Found',
        };
    }

    return {
        title: `${post.title} | U.men U-Class`,
        description: post.summary || 'Expert content from U.men',
    };
}

export default async function UClassDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch Content
    const { data: post, error } = await (await supabase)
        .from('admin_contents')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

    if (error || !post) {
        notFound();
    }

    // 2. Fetch User & Admin Status
    const { data: { user } } = await (await supabase).auth.getUser();
    let isAdmin = false;
    if (user) {
        const { data: userData } = await (await supabase)
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        isAdmin = userData?.role === 'ADMIN';
    }

    // 3. Fetch Comments
    const comments = await getComments(id);

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-[#B3E5FC] selection:text-slate-900">
            <LandingHeader />

            <main className="pt-32 pb-24">
                <article className="max-w-3xl mx-auto px-6">
                    {/* Header */}
                    <div className="mb-12 text-center">
                        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 transition-colors text-sm font-medium">
                            <ArrowLeft size={16} />
                            홈으로 돌아가기
                        </Link>

                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                                ARTICLE
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight break-keep whitespace-pre-wrap">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-center gap-6 text-slate-500 text-sm">
                            <div className="flex items-center gap-2">
                                <User size={16} />
                                <span className="font-medium">U.men MENTOR</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <hr className="border-slate-100 mb-12" />

                    {/* Content Body */}
                    <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-700 prose-img:rounded-2xl prose-img:shadow-md [&_p:empty]:min-h-[1.5em]">
                        {/* 
                           Since we use ReactQuill, the content is HTML.
                           We need to be careful about XSS, but here we assume admin content is trusted.
                        */}
                        <div dangerouslySetInnerHTML={{ __html: post.body || '' }} />
                    </div>

                    {/* Footer / Share / Navigation could go here */}
                    <div className="mt-20 pt-10 border-t border-slate-100 text-center mb-16">
                        <p className="text-slate-400 font-medium mb-6">이 콘텐츠가 도움이 되셨나요?</p>
                        <Link
                            href="/"
                            className="inline-block px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform duration-300"
                        >
                            다른 콘텐츠 더 보기
                        </Link>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-slate-100 pt-10">
                        <CommentSection
                            contentId={id}
                            initialComments={comments}
                            currentUser={user}
                            isAdmin={isAdmin}
                        />
                    </div>
                </article>
            </main>

            {/* Simple Footer */}
            <footer className="w-full py-10 border-t border-slate-100 mt-12 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-slate-400 text-sm">
                    <div>© U.men. All rights reserved.</div>
                </div>
            </footer>
        </div>
    );
}
