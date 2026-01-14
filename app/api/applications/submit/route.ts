import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { applicationFormSchema } from '@/types/application-schema';
import { encrypt } from '@/lib/encryption';
import { Database } from '@/types/database';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();

        const supabase = createServerClient<Database>(
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
        const json = await request.json();

        // 1. Validate with Zod
        const validationResult = applicationFormSchema.safeParse(json);

        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Invalid form data', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        // 2. Encrypt PII
        // Note: 'name', 'dob', 'gender' are stored as plain text per requirements
        // 'phone', 'email', 'address' are encrypted
        const pii_phone_encrypted = encrypt(data.personal.phone);
        const pii_email_encrypted = encrypt(data.personal.email);
        const pii_address_encrypted = encrypt(data.personal.address);

        // 3. Prepare structured data for JSONB column
        // We remove the personal info that is already stored in main columns to avoid duplication/confusion,
        // OR we can keep it all in JSONB for easier full-read. 
        // Decision: Store main columns for query/indexing, and everything else in JSONB.
        // Ideally, we shouldn't duplicate PII in JSONB if it's supposed to be encrypted in columns.

        const { personal, ...otherSections } = data;

        // 4. Insert into Database
        // Assuming posting_id is passed in the request or part of the form data context.
        // Ideally the form submission URL should be /api/postings/[id]/apply or body contains posting_id.
        // For now, let's assume body has posting_id (though not in schema explicitly, we can add it or extract it).
        // Let's check if the request body has posting_id outside the form schema or if we should add it to schema.
        // The prompt didn't specify posting_id in schema, so let's check input JSON for it.

        // Check if user is logged in (optional, but good for user_id)
        const { data: { session } } = await supabase.auth.getSession();
        const user_id = session?.user?.id || null; // Can be null for guest applicants if allowed

        // We need posting_id. If it's not in the validated data, check raw json
        const posting_id = (json as any).posting_id;
        if (!posting_id) {
            return NextResponse.json({ error: 'Missing posting_id' }, { status: 400 });
        }

        const { error } = await supabase.from('applications').insert({
            posting_id,
            user_id,
            status: 'APPLIED',

            // Personal Info (Plain)
            name: personal.name,
            dob: personal.dob,
            gender: personal.gender,
            photo_url: personal.photo_url,

            // PII (Encrypted)
            pii_phone_encrypted,
            pii_email_encrypted,
            pii_address_encrypted,

            // JSONB Data (Education, Work, etc.)
            application_data: otherSections as any, // Cast to Json compatible

            // Other top-level mapping
            portfolio_url: data.portfolio_url || null,

            // Default / Meta
            consent_given_at: new Date().toISOString(),
            blind_mode_enabled: true, // Defaulting to true as per schema default, or make configurable
        } as any);

        if (error) {
            console.error('Database Error:', error);
            return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 201 });

    } catch (error) {
        console.error('Submission Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
