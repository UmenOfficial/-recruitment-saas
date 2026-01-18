'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getUserSession() {
    const supabase = await createServerSupabaseClient();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (error) {
        return null;
    }
}


export async function fetchPosts(category?: string) {
    const supabase = await createServerSupabaseClient();

    let query = supabase
        .from('posts')
        .select(`
            *,
            comments (count)
        `)
        .order('created_at', { ascending: false });

    if (category && category !== 'ALL') {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching posts:', error);
        return [];
    }

    // Map comment count
    return (data as any[]).map((post: any) => ({
        ...post,
        comment_count: post.comments?.[0]?.count || 0
    }));
}

export async function fetchPostDetail(id: string) {
    const supabase = await createServerSupabaseClient();

    // Increment View Count (Skip for now as it requires RPC or RLS bypass)

    const { data: post, error } = await supabase
        .from('posts')
        .select(`
            *,
            comments (
                id, content, created_at, user_id,
                users ( role )
            )
        `)
        .eq('id', id)
        .single();

    if (error) return null;

    // Sort comments by created_at desc
    const safePost = post as any;
    if (safePost.comments) {
        safePost.comments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Secret Post Access Control
    // If is_secret is true, only Admin OR Author can view
    if (safePost.is_secret) {
        const session = await getUserSession();
        // If no session, return locked post (Viewer is Guest)
        if (!session) {
            return {
                ...safePost,
                content: null,
                image_urls: [],
                comments: [],
                is_locked: true
            };
        }

        const { data: userRole } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        const safeUserRole = userRole as any;
        const isAdmin = safeUserRole?.role === 'SUPER_ADMIN' || safeUserRole?.role === 'ADMIN';
        const isAuthor = safePost.user_id === session.user.id;

        if (!isAdmin && !isAuthor) {
            // Return limited data or null?
            // Usually returns error or limited data.
            // Let's return a special flag or just minimal data so UI can show "Secret Post" lock screen.
            return {
                ...safePost,
                content: null, // Hide content
                image_urls: [], // Hide images
                comments: [], // Hide comments
                is_locked: true // UI helper flag
            };
        }
    }

    return safePost;
}

export async function addComment(postId: string, content: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return { success: false, error: '로그인이 필요합니다.' };
    }

    // Check Post status
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (postError || !post) {
        return { success: false, error: '게시글을 찾을 수 없습니다.' };
    }
    const safePost = post as any;

    // Permission Logic
    const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    const safeUserRole = userRole as any;
    const isAdmin = safeUserRole?.role === 'SUPER_ADMIN' || safeUserRole?.role === 'ADMIN';

    // Secret Post Logic (QNA OR is_secret)
    // We treat QNA as secret by default for backward compatibility, AND check is_secret column
    const isSecret = safePost.is_secret || safePost.category === 'QNA';

    if (isSecret) {
        // Only Admin can comment on Secret Posts
        // Wait, Author cannot comment on their own secret post?
        // Requirement: "user가 글을 작성하면 관리자만 댓글을 작성할 수 있어야 해." -> Yes, Author creates post, Admin replies.
        // What if Author wants to reply to Admin? Usually Q&A allows Author reply too.
        // But user said exactly: "관리자만 댓글을 작성할 수 있어야 해."
        // I will follow strictly: Only Admin.
        if (!isAdmin) {
            return { success: false, error: '비밀글에는 관리자만 답변을 작성할 수 있습니다.' };
        }
    }

    const { error } = await supabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: session.user.id,
            content: content
        } as any);

    if (error) {
        console.error('Comment Insert Error:', error);
        return { success: false, error: '댓글 작성 실패' };
    }

    return { success: true };
}
