/**
 * Supabase Server Helper
 * Server-side Supabase client instance for Node.js/server runtime
 * Used in Server Components, Route Handlers, and Server Actions
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfig, validateSupabaseConfig } from './config';

/**
 * Get Supabase server client
 * Creates a new instance for each request (important for SSR)
 * Handles cookies for session management
 */
export async function getSupabaseServerClient() {
  validateSupabaseConfig();

  const cookieStore = await cookies();

  return createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
