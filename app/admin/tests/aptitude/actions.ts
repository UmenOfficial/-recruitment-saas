
'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Dangerous: Service Role Client (Bypasses RLS)
const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Ensure the user is an admin
async function ensureAdmin() {
    const cookieStore = await cookies();

    // 1. Create a standard SSR client to check the session from cookies
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('Unauthorized');
    }

    // 2. Check Admin Role using Service Role Client (to read 'users' table confidently)
    const { data: userData, error: userError } = await serviceSupabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (userError || !userData || (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN')) {
        throw new Error('Forbidden: Insufficient Permissions');
    }
}

export async function fetchAptitudeTestsAction() {
    try {
        await ensureAdmin();
        const { data: testsData, error } = await serviceSupabase
            .from('tests')
            .select('*, test_questions(count)')
            .eq('type', 'APTITUDE')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map count
        const formatted = testsData.map((t: any) => ({
            ...t,
            question_count: t.test_questions?.[0]?.count || 0
        }));

        return { success: true, data: formatted };
    } catch (error: any) {
        console.error('fetchAptitudeTestsAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function createAptitudeTestAction(title: string, description: string, time_limit: number | null) {
    try {
        await ensureAdmin();
        const { error } = await serviceSupabase
            .from('tests')
            .insert({
                title,
                description,
                time_limit,
                type: 'APTITUDE',
                status: 'DRAFT'
            });

        if (error) throw error;

        revalidatePath('/admin/tests/aptitude');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAptitudeTestAction(id: string, title: string, description: string, time_limit: number | null) {
    try {
        await ensureAdmin();
        const { error } = await serviceSupabase
            .from('tests')
            .update({
                title,
                description,
                time_limit
            })
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/tests/aptitude');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function deleteAptitudeTestAction(id: string) {
    try {
        await ensureAdmin();
        const { error } = await serviceSupabase.from('tests').delete().eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/tests/aptitude');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchAptitudeTestDetailAction(id: string) {
    try {
        await ensureAdmin();
        // 1. Fetch Test Details
        const { data: testData, error: testError } = await serviceSupabase
            .from('tests')
            .select('*')
            .eq('id', id)
            .single();
        if (testError) throw testError;

        // 2. Fetch All Aptitude Questions
        const { data: allQuestions, error: qError } = await serviceSupabase
            .from('questions')
            .select('*')
            .eq('type', 'APTITUDE')
            .order('created_at', { ascending: false });
        if (qError) throw qError;

        // 3. Fetch Already Added Questions (with existing order)
        const { data: existingRelations, error: rError } = await serviceSupabase
            .from('test_questions')
            .select('question_id, order_index, questions(*)')
            .eq('test_id', id)
            .order('order_index', { ascending: true });
        if (rError) throw rError;

        const addedQuestions = existingRelations.map((r: any) => ({
            ...r.questions,
            order_index: r.order_index
        }));

        return {
            success: true,
            data: {
                test: testData,
                allQuestions,
                addedQuestions
            }
        };

    } catch (error: any) {
        console.error('fetchAptitudeTestDetailAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function saveAptitudeTestConfigAction(
    testId: string,
    items: { question_id: string; order_index: number }[],
    imageUrl?: string
) {
    try {
        await ensureAdmin();
        // 1. Update Image if provided (optional)
        if (imageUrl !== undefined) {
            const { error: imgError } = await serviceSupabase
                .from('tests')
                .update({ image_url: imageUrl })
                .eq('id', testId);
            if (imgError) throw imgError;
        }

        // 2. Delete existing relations
        const { error: delError } = await serviceSupabase
            .from('test_questions')
            .delete()
            .eq('test_id', testId);
        if (delError) throw delError;

        // 3. Insert new relations
        if (items.length > 0) {
            const payload = items.map(item => ({
                test_id: testId,
                question_id: item.question_id,
                order_index: item.order_index
            }));

            const { error: insError } = await serviceSupabase
                .from('test_questions')
                .insert(payload);
            if (insError) throw insError;
        }

        revalidatePath(`/admin/tests/aptitude/${testId}`);
        return { success: true };

    } catch (error: any) {
        console.error('saveAptitudeTestConfigAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateAptitudeTestImageAction(id: string, imageUrl: string) {
    try {
        await ensureAdmin();
        const { error } = await serviceSupabase
            .from('tests')
            .update({ image_url: imageUrl })
            .eq('id', id);

        if (error) throw error;
        revalidatePath(`/admin/tests/aptitude/${id}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
