'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type Comment = {
    id: string;
    content_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    is_secret: boolean;
    created_at: string;
    user: {
        full_name: string;
        email: string;
    };
    replies?: Comment[]; // For UI tree structure
};

export async function getComments(contentId: string): Promise<Comment[]> {
    const supabase = createClient();
    const { data: { user: currentUser } } = await (await supabase).auth.getUser();

    // 1. Fetch user role first to check if ADMIN
    let isAdmin = false;
    if (currentUser) {
        const { data: userData } = await (await supabase)
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        isAdmin = userData?.role === 'ADMIN';
    }

    // 2. Fetch comments with author info
    const { data: comments, error } = await (await supabase)
        .from('admin_content_comments')
        .select(`
            *,
            user:users (
                full_name,
                email
            )
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching comments:', error);
        return [];
    }

    const typedComments = comments as unknown as Comment[];

    // 3. Process secret comments (Data Masking)
    const processedComments = typedComments.map(comment => {
        // If not secret, show content
        if (!comment.is_secret) return comment;

        // If secret:
        // Show if:
        // 1. User is Admin
        // 2. User is the author of the comment
        // 3. (Optional) User is the author of the PARENT comment? (Usually yes for replies)
        //    -> Let's simplify: Only Admin and Author can see.
        //    -> Wait, if I ask a secret question, I want to see the Admin's secret answer.
        //    -> So if I am the author of the PARENT, I should probably see the reply? 
        //    -> Current Logic: Admin can see everything. Author can see their own.

        let canView = false;
        if (isAdmin) canView = true;
        if (currentUser && comment.user_id === currentUser.id) canView = true;

        // Check parent ownership for replies (if I wrote the question, I should see the answer)
        // This requires complex mapping or fetching.
        // For 'replies', usually the Admin answers. Admin answer might be secret? 
        // If Admin answers a secret question, usually the answer is secret too.
        // Let's implement basic Author/Admin visibility first.

        if (canView) {
            return comment;
        } else {
            return {
                ...comment,
                content: '🔒 비밀글입니다. (작성자와 관리자만 볼 수 있습니다.)',
            };
        }
    });

    // 4. Organize into tree structure (Parent -> Replies)
    const rootComments: Comment[] = [];
    const replyMap = new Map<string, Comment[]>();

    processedComments.forEach(comment => {
        if (comment.parent_id) {
            if (!replyMap.has(comment.parent_id)) {
                replyMap.set(comment.parent_id, []);
            }
            replyMap.get(comment.parent_id)!.push(comment);
        } else {
            rootComments.push(comment);
        }
    });

    // Attach replies to parents (Client can also do this, but server doing it saves client logic)
    // Actually, for simplicity, let's return flat list but processed, 
    // OR return deeply nested. Returning nested is nicer for UI.

    rootComments.forEach(root => {
        root.replies = replyMap.get(root.id) || [];
    });

    return rootComments;
}

export async function createComment(
    contentId: string,
    content: string,
    isSecret: boolean,
    parentId: string | null = null
) {
    const supabase = createClient();
    const { data: { user } } = await (await supabase).auth.getUser();

    if (!user) {
        throw new Error('로그인이 필요합니다.');
    }

    const { error } = await (await supabase)
        .from('admin_content_comments')
        .insert({
            content_id: contentId,
            user_id: user.id,
            parent_id: parentId,
            content,
            is_secret: isSecret,
        });

    if (error) {
        console.error('Error creating comment:', error);
        throw new Error('댓글 등록 실패');
    }

    revalidatePath(`/u-class/${contentId}`);
}

export async function deleteComment(commentId: string, contentId: string) {
    const supabase = createClient();
    const { data: { user } } = await (await supabase).auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Check permission (Own comment or Admin) - RLS handles this mostly, but good to check
    // Actually our RLS allows delete for own or admin. So direct delete is fine.

    const { error } = await (await supabase)
        .from('admin_content_comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        console.error('Error deleting comment:', error);
        throw new Error('댓글 삭제 실패');
    }

    revalidatePath(`/u-class/${contentId}`);
}
