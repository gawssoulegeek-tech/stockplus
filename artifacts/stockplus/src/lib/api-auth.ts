import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from './supabase-server'

/**
 * Vérifie l'authentification d'une requête API via Bearer token Supabase.
 * @returns { ok, user, profile?, error?, status? }
 *
 * Usage :
 *   const auth = await requireUser(req)
 *   if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })
 *   // auth.user.id est l'UID Supabase
 */
export async function requireUser(req: NextRequest): Promise<{
  ok: boolean
  user?: { id: string; email?: string }
  profile?: { uid: string; role: string; boutique_id: string | null; email: string; name?: string }
  error?: string
  status?: number
}> {
  let adminClient: SupabaseClient
  try {
    adminClient = getSupabaseAdminClient()
  } catch {
    return { ok: false, error: 'Configuration serveur manquante', status: 500 }
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Authentification requise', status: 401 }
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return { ok: false, error: 'Session invalide', status: 401 }
  }

  // Récupérer le profil
  const { data: profile } = await adminClient
    .from('users')
    .select('uid, email, name, role, boutique_id')
    .eq('uid', user.id)
    .single()

  return {
    ok: true,
    user: { id: user.id, email: user.email },
    profile: profile ?? undefined,
  }
}

/**
 * Vérifie que l'utilisateur est superadmin.
 */
export async function requireSuperadmin(req: NextRequest): Promise<{
  ok: boolean
  error?: string
  status?: number
}> {
  const auth = await requireUser(req)
  if (!auth.ok) return auth
  if (!auth.profile || auth.profile.role !== 'superadmin') {
    return { ok: false, error: 'Accès superadmin requis', status: 403 }
  }
  return { ok: true }
}
