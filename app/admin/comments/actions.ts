'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type AdminCommentItem = {
    id: string;
    content_id: string;
    content_title: string;
    user_id: string;
    user_name: string;
    user_email: string;
    content: string;
    is_secret: boolean;
    created_at: string;
    has_reply: boolean;
};

export type AdminPostItem = {
    id: string;
    title: string;
    content: string;
    category: string;
    user_name: string;
    user_email: string;
    created_at: string;
    comment_count: number;
    view_count: number;
};

export async function getAllCommentsForAdmin(): Promise<AdminCommentItem[]> {
    const supabase = createClient();

    // Check Admin
    const { data: { user } } = await (await supabase).auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Fetch all root comments (parent_id is null)
    // Join with admin_contents to get title
    // Join with users to get author info
    // Left join with comments (self) to check if reply exists

    const { data, error } = await (await supabase)
        .from('admin_content_comments')
        .select(`
            id,
            content_id,
            content,
            is_secret,
            created_at,
            user_id,
            admin_contents!inner (title),
            users (full_name, email),
            replies:admin_content_comments(id)
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching admin comments:', error);
        return [];
    }

    // Transform data
    return data.map((item: any) => ({
        id: item.id,
        content_id: item.content_id,
        content_title: item.admin_contents?.title || 'Unknown Content',
        user_id: item.user_id,
        user_name: item.users?.full_name || 'Unknown',
        user_email: item.users?.email || '',
        content: item.content,
        is_secret: item.is_secret,
        created_at: item.created_at,
        has_reply: item.replies && item.replies.length > 0
    }));
}

export async function getAllPostsForAdmin(): Promise<AdminPostItem[]> {
    const supabase = createClient();

    // Check Admin (using session client)
    const { data: { user } } = await (await supabase).auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Use Service Role Client for Data Access
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch Posts
    const { data: posts, error: postsError } = await supabaseAdmin
        .from('posts')
        .select(`
            id,
            title,
            content,
            category,
            created_at,
            view_count,
            comments(count),
            user_id
        `)
        .order('created_at', { ascending: false });

    if (postsError) {
        console.error('Error fetching admin posts:', postsError);
        return [];
    }

    // 2. Extract User IDs
    const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));

    // 3. Fetch Users
    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email')
            .in('id', userIds);

        if (!usersError && users) {
            usersMap = users.reduce((acc: any, user: any) => {
                acc[user.id] = user;
                return acc;
            }, {});
        }
    }

    // 4. Merge Data
    return posts.map((item: any) => {
        const user = usersMap[item.user_id];
        return {
            id: item.id,
            title: item.title,
            content: item.content,
            category: item.category,
            user_name: user?.full_name || 'Unknown',
            user_email: user?.email || '',
            created_at: item.created_at,
            comment_count: item.comments?.[0]?.count || 0,
            view_count: item.view_count || 0
        };
    });
}

export async function deletePost(id: string) {
    const supabase = createClient();

    // Check Admin
    const { data: { user } } = await (await supabase).auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Use Service Role Client
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting post:', error);
        throw new Error('Failed to delete post');
    }
}
