import Link from "next/link";
import { MessageSquare, ArrowLeft, LogIn } from "lucide-react";
import { getUserSession } from "./actions";

export default async function CommunityLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getUserSession();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Community Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <Link href="/community" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                <MessageSquare size={18} fill="currentColor" />
                            </div>
                            <span className="font-black text-xl text-slate-800 tracking-tight">U-Talk</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <Link href="/community/write" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">
                                글쓰기
                            </Link>
                        ) : (
                            <Link href="/login?next=/community" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm transition-colors">
                                <LogIn size={18} />
                                로그인
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
