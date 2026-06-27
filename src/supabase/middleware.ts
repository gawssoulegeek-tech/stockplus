/**
 * Supabase Middleware
 * Middleware to handle authentication and session management
 * Place in middleware.ts at project root for proper routing
 * 
 * OPTIONAL: Use only if you need session refreshing or protected routes
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, serialize } from '@supabase/ssr';
import { supabaseConfig } from './config';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabaseResponse;
}

/**
 * To use this middleware, create/update middleware.ts at project root:
 * 
 * import { type NextRequest } from 'next/server';
 * import { updateSession } from '@/supabase/middleware';
 *
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request);
 * }
 *
 * export const config = {
 *   matcher: [
 *     // All routes except those starting with:
 *     // - _next/static (static files)
 *     // - _next/image (image optimization files)
 *     // - favicon.ico (favicon file)
 *     '/((?!_next/static|_next/image|favicon.ico).*)',
 *   ],
 * };
 */
