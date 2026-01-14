import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/candidate/dashboard';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';

            let redirectUrl = `${origin}${next}`;

            if (process.env.NEXT_PUBLIC_SITE_URL) {
                redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${next}`;
            } else if (forwardedHost && !isLocalEnv) {
                redirectUrl = `https://${forwardedHost}${next}`;
            }

            return NextResponse.redirect(redirectUrl);
        } else {
            console.error('Auth Callback Error:', error);
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
