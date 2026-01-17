'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getUserSession() {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
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
    return data.map((post: any) => ({
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
                id, content, created_at, user_id
            )
        `)
        .eq('id', id)
        .single();

    if (error) return null;

    // Sort comments by created_at desc
    if (post.comments) {
        post.comments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return post;
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
        .select('category, user_id')
        .eq('id', postId)
        .single();

    if (postError || !post) {
        return { success: false, error: '게시글을 찾을 수 없습니다.' };
    }

    // Permission Logic
    const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    const isAdmin = userRole?.role === 'SUPER_ADMIN' || userRole?.role === 'ADMIN';

    // Secret Post Logic (QNA)
    const isSecret = post.category === 'QNA';

    if (isSecret) {
        // Only Admin can comment on Secret Posts
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
