/**
 * Supabase Client Helper
 * Client-side Supabase client instance for browser usage
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, validateSupabaseConfig } from './config';

let supabaseClient: ReturnType<typeof createClient> | null = null;

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

    supabaseClient = createClient(
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
) as ReturnType<typeof createClient>;
