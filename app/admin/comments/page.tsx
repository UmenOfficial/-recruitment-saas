import { getAllCommentsForAdmin, getAllPostsForAdmin } from './actions';
import CommentAdminList from './CommentAdminList';

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
    const comments = await getAllCommentsForAdmin();
    const posts = await getAllPostsForAdmin();

    return <CommentAdminList initialComments={comments} initialPosts={posts} />;
}
