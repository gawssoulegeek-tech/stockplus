/**
 * Supabase Client Helper
 * Client-side Supabase client instance for browser usage
 *
 * ⚠️ Utilise @supabase/ssr pour que la session soit stockée dans des cookies
 * (et non dans localStorage). Cela permet au middleware Next.js de voir la
 * session et de protéger les routes /dashboard, /saas, etc.
 */

import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig, validateSupabaseConfig } from './config';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create Supabase browser client
 * Singleton pattern to ensure only one client instance
 */
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client can only be used in the browser');
  }

  if (!supabaseClient) {
    validateSupabaseConfig();

    supabaseClient = createBrowserClient(
      supabaseConfig.url,
      supabaseConfig.anonKey
    );
  }

  return supabaseClient;
}

/**
 * Export a default instance for common use cases
 * Can be imported directly with: import { supabase } from '@/supabase/client'
 */
export const supabase = new Proxy(
  {},
  {
    get: (_target, prop) => (getSupabaseClient() as Record<string | symbol, unknown>)[prop],
  }
) as ReturnType<typeof createBrowserClient>;
