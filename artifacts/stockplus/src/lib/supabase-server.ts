import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('SUPABASE_URL environment variable is required')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}

export function getSupabaseUserClient(token: string): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url) throw new Error('SUPABASE_URL environment variable is required')
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY environment variable is required')
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
