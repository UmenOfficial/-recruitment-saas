import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );


  // 1. Session Refresh & Auth Check
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error: any) {
    // Suppress "Invalid Refresh Token" error as it just means the user needs to re-login
    // This often happens in dev when restarting servers or switching accounts
    if (error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('Refresh Token Not Found')) {
      // Just silently fail authentication, logic below will redirect to login
      session = null;
    } else {
      console.error('Middleware: Session validation error:', error);
    }
  }


  // 1.5.1 Candidate Authentication Guard
  if (req.nextUrl.pathname.startsWith('/candidate')) {
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('next', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 1.5 Admin Authentication Guard
  if (req.nextUrl.pathname.startsWith('/admin')) {

    // [Invisible Cloak] Scecret Key Verification
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'umen_master_key_2026'; // Fallback for dev, but strictly use ENV in prod
    const hasSecretCookie = req.cookies.get('admin_hide_pass')?.value === 'true';
    const hasSecretParam = req.nextUrl.searchParams.get('secret') === ADMIN_SECRET_KEY;

    if (!hasSecretCookie && !hasSecretParam) {
      // If neither cookie nor param exists, redirect to Home (Hidden mode)
      return NextResponse.redirect(new URL('/', req.url));
    }

    // If param is correct but cookie is missing, set cookie and redirect to clean URL
    if (hasSecretParam && !hasSecretCookie) {
      const response = NextResponse.redirect(new URL('/admin/login', req.url));
      response.cookies.set('admin_hide_pass', 'true', { httpOnly: true, path: '/' });
      return response;
    }

    // Standard Auth Check
    if (!session && !req.nextUrl.pathname.startsWith('/admin/login')) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/admin/login';
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Role Check (Only if session exists)
    if (session) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || (userRole.role !== 'SUPER_ADMIN' && userRole.role !== 'ADMIN')) {
        console.warn(`[Security] Unauthorized access attempt to ${req.nextUrl.pathname} by ${session.user.id} (Role: ${userRole?.role})`);
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
  }

  // 2. God Mode (Impersonation) Logic
  const impersonateTargetId = req.headers.get('x-impersonate-id');

  if (impersonateTargetId && session) {
    // Verify current user is SUPER_ADMIN
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userRole?.role === 'SUPER_ADMIN') {
      console.warn(`[AUDIT] Super Admin ${session.user.id} is impersonating ${impersonateTargetId}`);
      response.headers.set('x-act-as-user-id', impersonateTargetId);
    } else {
      return new NextResponse('Unauthorized Impersonation', { status: 403 });
    }
  }

  // 3. Kill Switch (Emergency Controls)
  if (session) {
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id, companies(status)')
      .eq('user_id', session.user.id)
      .single();

    if (membership && membership.companies) {
      // @ts-expect-error reason: Supabase query types for nested relations can be tricky
      const companyStatus = membership.companies.status;
      if (companyStatus === 'SUSPENDED') {
        return new NextResponse(
          JSON.stringify({ error: 'Service Suspended', message: 'Contact Support' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/evaluator/:path*', '/jobs/:id/apply', '/candidate/:path*', '/sample/:path*'],
};
