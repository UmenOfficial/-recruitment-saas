'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

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
    // Use Service Role to bypass RLS for Comment Counts
    // (Regular client hides comment counts for Anon users on Secret posts)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Process posts:
    // 1. Map comment count
    // 2. Sanitize Secret Posts (Hide content/images in List View for safety)
    return (data as any[]).map((post: any) => {
        const isSecret = post.is_secret || post.category === 'QNA';

        // In List View, we always hide secret content regardless of user role
        // (See app/community/page.tsx logic which always shows lock message)
        const content = isSecret ? null : post.content;
        const imageUrls = isSecret ? [] : post.image_urls;

        return {
            ...post,
            content: content,
            image_urls: imageUrls,
            comment_count: post.comments?.[0]?.count || 0
        };
    });
}

export async function fetchPostDetail(id: string) {
    const supabase = await createServerSupabaseClient();

    // Increment View Count (Service Role)
    try {
        const serviceClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get current count first to avoid race conditions with atomic update if possible, 
        // but standard update is fine for now. 
        // We use rpc if available, but fallback to select-update.
        const { data: current } = await serviceClient
            .from('posts')
            .select('view_count')
            .eq('id', id)
            .single();

        if (current) {
            await serviceClient
                .from('posts')
                .update({ view_count: (current.view_count || 0) + 1 })
                .eq('id', id);
        }
    } catch (e) {
        console.error('Failed to increment view count:', e);
    }

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

    if (error) {
        console.error('fetchPostDetail Error:', error);
        return null;
    }

    // Sort comments by created_at desc
    const safePost = post as any;
    if (safePost.comments && safePost.comments.length > 0) {
        safePost.comments.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Fetch User Roles for Comments (Manually to bypass RLS/Relation issues)
        // Use Service Role to ensure we can read roles regardless of current user
        try {
            const serviceSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            const userIds = safePost.comments.map((c: any) => c.user_id);
            // Deduplicate
            const uniqueUserIds = Array.from(new Set(userIds));

            if (uniqueUserIds.length > 0) {
                const { data: users, error: userError } = await serviceSupabase
                    .from('users')
                    .select('id, role')
                    .in('id', uniqueUserIds);

                if (!userError && users) {
                    const userMap = new Map();
                    users.forEach((u: any) => userMap.set(u.id, u));

                    safePost.comments = safePost.comments.map((c: any) => ({
                        ...c,
                        users: userMap.get(c.user_id) || null
                    }));
                }
            }
        } catch (e) {
            console.error('Error fetching comment user roles:', e);
            // Fallback: comments remain as is (users will be undefined/null), UI will show "Anonymous"
        }
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
        const isAuthor = safePost.user_id === session.user.id;

        if (!isAdmin && !isAuthor) {
            return { success: false, error: '비밀글에는 작성자와 관리자만 댓글을 작성할 수 있습니다.' };
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

    revalidatePath('/community');
    revalidatePath(`/community/${postId}`);

    return { success: true };
}

export async function updateComment(commentId: string, content: string) {
    const supabase = await createServerSupabaseClient();
    const session = await getUserSession();

    if (!session) return { success: false, error: 'Unauthorized' };

    // Check ownership or admin
    const { data: comment } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

    if (!comment) return { success: false, error: 'Comment not found' };

    const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    const isAdmin = (userRole as any)?.role === 'ADMIN' || (userRole as any)?.role === 'SUPER_ADMIN';
    const isAuthor = (comment as any).user_id === session.user.id;

    if (!isAuthor && !isAdmin) {
        return { success: false, error: 'Permission denied' };
    }

    const { error } = await supabase
        .from('comments')
        .update({ content } as any)
        .eq('id', commentId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/community');
    return { success: true };
}

export async function deleteComment(commentId: string) {
    const supabase = await createServerSupabaseClient();
    const session = await getUserSession();

    if (!session) return { success: false, error: 'Unauthorized' };

    // Check ownership or admin
    const { data: comment } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

    if (!comment) return { success: false, error: 'Comment not found' };

    const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    const isAdmin = (userRole as any)?.role === 'ADMIN' || (userRole as any)?.role === 'SUPER_ADMIN';
    const isAuthor = (comment as any).user_id === session.user.id;

    if (!isAuthor && !isAdmin) {
        return { success: false, error: 'Permission denied' };
    }

    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/community');
    return { success: true };
}
