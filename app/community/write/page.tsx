import PostWriteForm from "./PostWriteForm";
import { getUserSession } from "../actions";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function WritePage() {
    const session = await getUserSession();
    if (!session) {
        redirect('/login?next=/community/write');
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-black text-slate-800 mb-6">새로운 글 작성하기</h1>
            <PostWriteForm />
        </div>
    );
}
