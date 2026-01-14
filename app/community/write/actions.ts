'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPostAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error('Unauthorized');
    }

    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const category = formData.get('category') as string;
    // Image URLs are handled by client upload -> passed as hidden input strings joined by comma or similar
    // Or we handle upload here? Plan says: Drag & Drop upload. 
    // Usually client uploads to storage -> gets URL -> sends URL to DB.
    const imageUrlsRaw = formData.get('image_urls') as string;
    const imageUrls = imageUrlsRaw ? JSON.parse(imageUrlsRaw) : [];

    if (!title || !content) {
        throw new Error('Title and content required');
    }

    const { data, error } = await supabase
        .from('posts')
        .insert({
            user_id: session.user.id,
            title,
            content,
            category,
            image_urls: imageUrls,
        })
        .select()
        .single();

    if (error) {
        console.error('Create Post Error:', error);
        throw new Error(error.message);
    }

    revalidatePath('/community');
    revalidatePath('/community');
    return { id: data.id };
}
