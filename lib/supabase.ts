/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client for use throughout the application.
 * It provides both client-side and server-side Supabase instances.
 * 
 * @module lib/supabase
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
    console.warn(
        '⚠️ Missing Supabase environment variables. Using placeholder values. App will NOT function correctly until .env.local is configured.'
    );
}

/**
 * Supabase client for client-side operations
 * Use this in React components and client-side code.
 * It uses cookies (via @supabase/ssr) to share session with the server (Middleware/Server Components).
 */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side client has been moved to lib/supabase-server.ts to avoid "next/headers" build errors in Client Components.
