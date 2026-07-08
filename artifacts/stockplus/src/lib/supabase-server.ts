import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/**
 * Récupère une variable d'environnement en essayant plusieurs noms.
 * Sur Vercel, l'utilisateur peut avoir nommé ses variables avec ou sans
 * le préfixe NEXT_PUBLIC_.
 */
function getEnvVar(...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = process.env[key]
    if (val && val.trim() !== '') return val
  }
  return undefined
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const url = getEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getEnvVar(
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'
  )

  if (!url) {
    console.error('[supabase-server] SUPABASE_URL manquant. Variables d\'env disponibles :', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
    throw new Error('SUPABASE_URL environment variable is required')
  }
  if (!serviceRoleKey) {
    console.error('[supabase-server] SUPABASE_SERVICE_ROLE_KEY manquant. Variables d\'env disponibles :', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return adminClient
}

export function getSupabaseUserClient(token: string): SupabaseClient {
  const url = getEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnvVar('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!url) throw new Error('SUPABASE_URL environment variable is required')
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY environment variable is required')
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
