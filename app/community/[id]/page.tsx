import { fetchPostDetail, getUserSession } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle, LogIn, Lock, ImageIcon } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const post = await fetchPostDetail(id);
    const session = await getUserSession();

    if (!post) notFound();

    const isLoggedIn = !!session;

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

            {/* Post Content Area */}
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
                <div className={`prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line ${!isLoggedIn && "blur-[2px] select-none opacity-60"}`}>
                    {isLoggedIn ? post.content : post.content.slice(0, 50) + "\n\n(내용이 더 있습니다...)"}
                    {!isLoggedIn && (
                        // Fake Text for visual filler
                        Array(5).fill(0).map((_, i) => (
                            <p key={i} className="text-slate-300">
                                로그인하지 않은 사용자에게는 내용이 보이지 않습니다. 이 영역은 블러 처리된 텍스트입니다.
                                커뮤니티의 건전한 운영을 위해 로그인이 필요합니다.
                            </p>
                        ))
                    )}
                </div>

                {/* Login Overlay for Guest */}
                {!isLoggedIn && (
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent flex flex-col items-center justify-center pt-20">
                        <Lock size={48} className="text-indigo-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요한 콘텐츠입니다</h3>
                        <p className="text-slate-500 mb-6 text-center max-w-xs">
                            전체 내용과 댓글을 확인하려면<br />로그인이 필요해요.
                        </p>
                        <Link href={`/login?next=/community/${id}`} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:translate-y-[-2px] transition-all flex items-center gap-2">
                            <LogIn size={20} />
                            3초만에 로그인하기
                        </Link>
                    </div>
                )}
            </div>

            {/* Comments Section (Logged In Only) */}
            {isLoggedIn && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MessageCircle className="text-indigo-600" />
                        댓글 <span className="text-indigo-600">{post.comments?.length || 0}</span>
                    </h3>

                    {/* Comment List */}
                    <div className="space-y-4 mb-8">
                        {post.comments && post.comments.length > 0 ? (
                            post.comments.map((comment: any) => (
                                <div key={comment.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">U</div>
                                            <span className="text-sm font-bold text-slate-700">익명</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed">{comment.content}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                아직 댓글이 없습니다. 첫 댓글을 남겨주세요!
                            </div>
                        )}
                    </div>

                    {/* Comment Form */}
                    <form action="#" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-3">
                        {/* Placeholder for now. We need client interaction for real submission or Server Action with revalidate */}
                        {/* Since this is a server component, we need a Client Component island for the form or standard form action */}
                        {/* For simplicity as first pass, just UI. Real logic needs client comp. */}
                        <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-500">
                            댓글 기능 준비 중...
                        </div>
                        <button type="button" disabled className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center opacity-50 cursor-not-allowed">
                            등록
                        </button>
                    </form>
                    <p className="text-xs text-slate-400 mt-2 ml-2">* 건전한 소통을 위해 비방이나 욕설은 제한될 수 있습니다.</p>
                </div>
            )}
        </div>
    );
}
