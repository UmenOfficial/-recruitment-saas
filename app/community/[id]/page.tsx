
import { fetchPostDetail, getUserSession } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle, LogIn, Lock, ImageIcon } from "lucide-react";
import CommentForm from "../CommentForm";
import CommentList from "../CommentList";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const post: any = await fetchPostDetail(id);
    const session = await getUserSession();


    if (!post) notFound();

    const isLoggedIn = !!session;

    // Fetch Admin Role for UI
    let isAdmin = false;
    if (session) {
        const supabase = await createServerSupabaseClient();
        const { data: userRole } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single() as any;

        isAdmin = userRole?.role === 'SUPER_ADMIN' || userRole?.role === 'ADMIN';
    }

    const isSecret = post.category === 'QNA';

    return (
        <div className="max-w-3xl mx-auto">
            {/* Post Header */}
            <div className="bg-white p-8 rounded-t-[2rem] border border-slate-200 border-b-0 shadow-sm relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${post.category === 'FREE' ? 'bg-slate-100 text-slate-600' :
                        post.category === 'QNA' ? 'bg-orange-100 text-orange-600' :
                            post.category === 'REVIEW' ? 'bg-green-100 text-green-600' :
                                'bg-indigo-100 text-indigo-600'
                        }`}>
                        {post.category}
                    </span>
                    {(post.is_secret || post.category === 'QNA') && (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            <Lock size={12} />
                            비밀글
                        </span>
                    )}
                    <span className="text-sm text-slate-400">
                        {new Date(post.created_at).toLocaleDateString()}
                    </span>
                </div>
                <h1 className="text-2xl font-black text-slate-800 leading-tight mb-2">
                    {post.title}
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-xs">익명</span>
                    <span>·</span>
                    <span>조회 {post.view_count}</span>
                </div>
            </div>

            {/* Secret Post Lock Screen */}
            {post.is_locked ? (
                <div className="bg-white p-12 rounded-b-[2rem] border border-slate-200 border-t-0 shadow-sm text-center min-h-[300px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Lock size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">비밀글입니다</h3>
                    <p className="text-slate-500 mb-8 max-w-xs mx-auto">
                        작성자와 관리자만 내용을 확인할 수 있습니다.<br />
                        본인이 작성한 글이라면 로그인해주세요.
                    </p>
                    {!session && (
                        <Link href={`/login?next=/community/${id}`} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                            로그인하기
                        </Link>
                    )}
                    {session && (
                        <button onClick={() => history.back()} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                            뒤로가기
                        </button>
                    )}
                </div>
            ) : (
                /* Post Content Area */
                <div className="bg-white p-8 pt-2 rounded-b-[2rem] border border-slate-200 border-t-0 shadow-sm relative overflow-hidden min-h-[300px]">

                    {/* Image Gallery (Logged In Only OR First Image Blurred for Guest) */}
                    {post.image_urls && post.image_urls.length > 0 && (
                        <div className="mb-6 grid grid-cols-2 gap-2">
                            {isLoggedIn ? (
                                post.image_urls.map((url: string, idx: number) => (
                                    <img key={idx} src={url} alt={`Image ${idx}`} className="w-full h-48 object-cover rounded-xl border border-slate-100" />
                                ))
                            ) : (
                                // Guest: Show first image blurred
                                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100">
                                    <img src={post.image_urls[0]} alt="Blurred" className="w-full h-full object-cover blur-xl opacity-50" />
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold bg-white/30">
                                        <ImageIcon size={24} className="mr-2" />
                                        이미지 숨김 처리됨
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text Content */}
                    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                        {post.content}
                    </div>
                </div>
            )}

            {/* Comments Section */}
            {(!post.is_locked || isLoggedIn) && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MessageCircle className="text-indigo-600" />
                        댓글 <span className="text-indigo-600">{post.comments?.length || 0}</span>
                    </h3>

                    {isLoggedIn ? (
                        <>
                            {/* Comment List */}
                            <CommentList
                                comments={post.comments}
                                postId={id}
                                currentUserId={session?.user.id}
                                isAdmin={isAdmin}
                            />

                            {/* Comment Form */}
                            <CommentForm
                                postId={id}
                                isSecret={post.is_secret || post.category === 'QNA'}
                                isAdmin={isAdmin}
                                isAuthor={post.user_id === session?.user.id}
                            />
                            <p className="text-xs text-slate-400 mt-2 ml-2">* 건전한 소통을 위해 비방이나 욕설은 제한될 수 있습니다.</p>
                        </>
                    ) : (
                        /* Blurred Comments Placeholder for Guests */
                        <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden p-6">
                            <div className="space-y-6 opacity-30 blur-sm select-none pointer-events-none" aria-hidden="true">
                                {[1, 2].map((_, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-4 bg-slate-200 rounded" />
                                                <div className="w-12 h-3 bg-slate-100 rounded" />
                                            </div>
                                            <div className="w-full h-12 bg-slate-50 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 z-10">
                                <Lock size={32} className="text-indigo-300 mb-3" />
                                <p className="text-slate-600 font-bold mb-4">
                                    댓글은 로그인 후 확인할 수 있습니다
                                </p>
                                <Link
                                    href={`/login?next=/community/${id}`}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <LogIn size={16} />
                                    로그인하기
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

