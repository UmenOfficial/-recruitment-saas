'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type AdminContent = {
    id: string;
    title: string;
    type: 'VIDEO' | 'ARTICLE';
    content_url: string;
    summary: string | null;
    thumbnail_url: string | null;
    body: string | null;
    is_published: boolean;
    created_at: string;
};

export async function getContents() {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await (supabase as any)
        .from('admin_contents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching contents:', error);
        return [];
    }

    return data as AdminContent[];
}

export async function getPublishedContents() {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await (supabase as any)
        .from('admin_contents')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching published contents:', error);
        return [];
    }

    return data as AdminContent[];
}

export async function createContent(formData: FormData) {
    const supabase = await createServerSupabaseClient();

    const title = formData.get('title') as string;
    const type = formData.get('type') as 'VIDEO' | 'ARTICLE';
    const content_url = formData.get('content_url') as string;
    const summary = formData.get('summary') as string;
    const body = formData.get('body') as string;
    const thumbnail_file = formData.get('thumbnail') as File | null;

    let thumbnail_url: string | null = null;

    // Validation
    if (type === 'VIDEO' && !content_url) {
        throw new Error('Video URL is required');
    }
    if (type === 'ARTICLE' && !body) {
        throw new Error('Article content is required');
    }

    // Upload thumbnail if provided
    if (thumbnail_file && thumbnail_file.size > 0) {
        const filename = `${Date.now()}-${thumbnail_file.name}`;
        const { data, error } = await supabase
            .storage
            .from('admin_content_thumbnails')
            .upload(filename, thumbnail_file);

        if (error) {
            console.error('Error uploading thumbnail:', error);
            throw new Error('Thumbnail upload failed');
        }

        const { data: publicUrlData } = supabase
            .storage
            .from('admin_content_thumbnails')
            .getPublicUrl(filename);

        thumbnail_url = publicUrlData.publicUrl;
    }

    const { error } = await (supabase as any)
        .from('admin_contents')
        .insert({
            title,
            type,
            content_url: type === 'VIDEO' ? content_url : null,
            summary,
            body: type === 'ARTICLE' ? body : null,
            thumbnail_url: type === 'VIDEO' ? thumbnail_url : null,
            is_published: true,
        });

    if (error) {
        console.error('Error creating content:', error);
        throw new Error('Failed to create content');
    }

    revalidatePath('/admin/contents');
    revalidatePath('/'); // Update home page as well
}

export async function updateContent(id: string, formData: FormData) {
    const supabase = await createServerSupabaseClient();

    const title = formData.get('title') as string;
    const type = formData.get('type') as 'VIDEO' | 'ARTICLE';
    const content_url = formData.get('content_url') as string;
    const summary = formData.get('summary') as string;
    const body = formData.get('body') as string;
    const thumbnail_file = formData.get('thumbnail') as File | null;

    let thumbnail_url: string | undefined = undefined;

    // Validation
    if (type === 'VIDEO' && !content_url) {
        throw new Error('Video URL is required');
    }
    if (type === 'ARTICLE' && !body) {
        throw new Error('Article content is required');
    }

    // Upload thumbnail if provided (Update only if new file exists)
    if (thumbnail_file && thumbnail_file.size > 0) {
        const filename = `${Date.now()}-${thumbnail_file.name}`;
        const { error } = await supabase
            .storage
            .from('admin_content_thumbnails')
            .upload(filename, thumbnail_file);

        if (error) {
            console.error('Error uploading thumbnail:', error);
            throw new Error('Thumbnail upload failed');
        }

        const { data: publicUrlData } = supabase
            .storage
            .from('admin_content_thumbnails')
            .getPublicUrl(filename);

        thumbnail_url = publicUrlData.publicUrl;
    }

    const updatePayload: any = {
        title,
        type,
        content_url: type === 'VIDEO' ? content_url : null,
        summary,
        body: type === 'ARTICLE' ? body : null,
    };

    if (thumbnail_url !== undefined) {
        updatePayload.thumbnail_url = thumbnail_url;
    }

    const { error } = await (supabase as any)
        .from('admin_contents')
        .update(updatePayload)
        .eq('id', id);

    if (error) {
        console.error('Error updating content:', error);
        throw new Error('Failed to update content');
    }

    revalidatePath('/admin/contents');
    revalidatePath('/');
}

export async function deleteContent(id: string) {
    const supabase = await createServerSupabaseClient();

    const { error } = await (supabase as any)
        .from('admin_contents')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting content:', error);
        throw new Error('Failed to delete content');
    }

    revalidatePath('/admin/contents');
    revalidatePath('/');
}

export async function togglePublish(id: string, currentStatus: boolean) {
    const supabase = await createServerSupabaseClient();

    const { error } = await (supabase as any)
        .from('admin_contents')
        .update({ is_published: !currentStatus })
        .eq('id', id);

    if (error) {
        console.error('Error toggling publish status:', error);
        throw new Error('Failed to update status');
    }

    revalidatePath('/admin/contents');
    revalidatePath('/');
}

export async function uploadContentImage(formData: FormData): Promise<string> {
    const supabase = await createServerSupabaseClient();
    const file = formData.get('file') as File;

    if (!file) throw new Error('No file uploaded');

    // Sanitize filename: use timestamp + random string, preserve extension
    const fileExt = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

    const { data, error } = await supabase
        .storage
        .from('admin_content_images')
        .upload(filename, file);

    if (error) {
        console.error('Error uploading content image:', error);
        throw new Error('Image upload failed');
    }

    const { data: publicUrlData } = supabase
        .storage
        .from('admin_content_images')
        .getPublicUrl(filename);

    return publicUrlData.publicUrl;
}
