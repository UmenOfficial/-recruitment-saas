'use server';

import { createClient } from '@/lib/supabase/server';

export async function getUserSession() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function fetchPosts(category?: string) {
    const supabase = await createClient();

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
    const supabase = await createClient();

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

