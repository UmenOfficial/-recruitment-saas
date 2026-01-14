import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Type adjusted for Next.js 15+ if needed, assuming standard { params }
) {
    // Use await for params access in newer Next.js versions if strict async params
    const { id } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // Handle middleware cookie setting limitations
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // Handle middleware cookie setting limitations
                    }
                },
            },
        }
    );

    try {
        // 1. Auth Check (Middleware handles basics, but we check role)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return new NextResponse('Unauthorized', { status: 401 });

        // 2. Fetch Source Posting
        const { data: source, error: fetchError } = await supabase
            .from('postings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !source) {
            return new NextResponse('Posting not found', { status: 404 });
        }

        // 3. Verify Ownership (Corp Admin of the same company)
        // In a real app, strict RLS handles this, but explicit check is good.
        const { data: member } = await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', session.user.id)
            .single();

        if (source.company_id !== member?.company_id) {
            return new NextResponse('Forbidden: Different Company', { status: 403 });
        }

        // 4. Prepare New Data (Deep Copy Logic)
        // Omit system fields: id, created_at, updated_at, created_by (reset to current user)
        const {
            id: _id,
            created_at: _created_at,
            updated_at: _updated_at,
            created_by: _created_by,
            ...rest
        } = source;

        const newPostingData = {
            ...rest,
            title: `${source.title} (Copy)`,
            is_active: false, // Reset to Draft/Inactive
            deadline: null,   // Reset deadline
            created_by: session.user.id, // Set new owner
            // JSON fields (site_config, process_config, etc.) are copied by value in JS logic here
        };

        // 5. Insert New Posting
        const { data: newPosting, error: insertError } = await supabase
            .from('postings')
            .insert(newPostingData)
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json(newPosting);

    } catch (error: any) {
        console.error('Duplication Error:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
