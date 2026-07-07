import { NextRequest } from 'next/server'
import { getSupabaseAdminClient, getSupabaseUserClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { boutiqueId, emailReports } = body ?? {}
    if (!boutiqueId) {
      return Response.json({ error: 'boutiqueId requis' }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = getSupabaseAdminClient()
    } catch {
      return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const userClient = getSupabaseUserClient(token)
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return Response.json({ error: 'Session invalide ou expirée' }, { status: 401 })
    }

    const { data: userProfile } = await adminClient.from('users').select('role').eq('uid', user.id).single()
    if (!userProfile) {
      return Response.json({ error: 'Profil utilisateur introuvable' }, { status: 403 })
    }

    const { data: boutique } = await adminClient.from('boutiques').select('owner_id').eq('id', boutiqueId).single()
    if (!boutique) {
      return Response.json({ error: 'Boutique introuvable' }, { status: 404 })
    }

    if ((userProfile as { role: string }).role !== 'superadmin' && (boutique as { owner_id: string }).owner_id !== user.id) {
      return Response.json({ error: 'Accès non autorisé à cette boutique' }, { status: 403 })
    }

    const { data: currentBoutique } = await adminClient.from('boutiques').select('notifications').eq('id', boutiqueId).single()
    const current = ((currentBoutique as { notifications?: Record<string, unknown> } | null)?.notifications || {}) as Record<string, unknown>

    const { error } = await adminClient
      .from('boutiques')
      .update({ notifications: { ...current, emailReports } })
      .eq('id', boutiqueId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true, emailReports })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur interne'
    return Response.json({ error: msg }, { status: 500 })
  }
}
