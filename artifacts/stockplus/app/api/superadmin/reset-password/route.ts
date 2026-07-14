import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { requireUser } from '@/lib/api-auth'

/**
 * POST /api/superadmin/reset-password
 * Envoie un email de réinitialisation de mot de passe au propriétaire d'une boutique.
 *
 * Body: { boutique_id: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  // Vérifier que l'user est superadmin
  if (!auth.profile || auth.profile.role !== 'superadmin') {
    return Response.json({ error: 'Accès superadmin requis' }, { status: 403 })
  }

  let adminClient
  try {
    adminClient = getSupabaseAdminClient()
  } catch {
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const { boutique_id } = body

  if (!boutique_id) {
    return Response.json({ error: 'boutique_id requis' }, { status: 400 })
  }

  // Récupérer le propriétaire de la boutique
  const { data: boutique, error: bErr } = await adminClient
    .from('boutiques')
    .select('owner_id, name')
    .eq('id', boutique_id)
    .single()

  if (bErr || !boutique) {
    return Response.json({ error: 'Boutique introuvable' }, { status: 404 })
  }

  const ownerId = (boutique as { owner_id: string | null; name: string }).owner_id
  if (!ownerId) {
    return Response.json({ error: 'Aucun propriétaire associé à cette boutique' }, { status: 400 })
  }

  // Récupérer l'email du propriétaire
  const { data: user, error: uErr } = await adminClient
    .from('users')
    .select('email')
    .eq('uid', ownerId)
    .single()

  if (uErr || !user) {
    return Response.json({ error: 'Propriétaire introuvable dans la table users' }, { status: 404 })
  }

  const email = (user as { email: string }).email

  // Générer un lien de réinitialisation via Supabase Admin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stockplus.app'
  const { error: resetErr } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${appUrl}/password-reset`,
    },
  })

  if (resetErr) {
    console.error('[reset-password] generateLink error:', resetErr)
    return Response.json({ error: `Erreur: ${resetErr.message}` }, { status: 500 })
  }

  // Note : Supabase envoie automatiquement l'email de réinitialisation
  // si "Recovery" email template est activé dans Auth → Email Templates.

  // Logger dans audit_logs (utilise actor_id/actor_email, pas user_id/user_email)
  await adminClient.from('audit_logs').insert({
    boutique_id,
    actor_id: auth.user?.id,
    actor_email: auth.user?.email,
    action: 'update',
    status: 'success',
    entity_type: 'users',
    entity_id: ownerId,
    notes: `Réinitialisation mot de passe demandée par superadmin pour ${email}`,
    created_at: new Date().toISOString(),
  })

  return Response.json({
    ok: true,
    message: `Email de réinitialisation envoyé à ${email}`,
  })
}
