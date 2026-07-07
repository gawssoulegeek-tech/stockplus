import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * Cron : expire automatiquement les boutiques en essai dont
 * trial_ends_at < now() et les passe en 'Suspendu'.
 *
 * À appeler 1x/jour via Vercel Cron ou un scheduler externe.
 *
 * Exemple (vercel.json) :
 *   {
 *     "crons": [
 *       { "path": "/api/cron/expire-trials", "schedule": "0 2 * * *" }
 *     ]
 *   }
 */
export async function GET(req: NextRequest) {
  // Auth via CRON_SECRET
  const CRON_SECRET = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch {
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const now = new Date().toISOString()

  // Récupérer les boutiques en essai expirées
  const { data: expired, error: findError } = await supabase
    .from('boutiques')
    .select('id, name, owner_id, trial_ends_at')
    .eq('status', 'Essai')
    .lt('trial_ends_at', now)

  if (findError) {
    return Response.json({ error: 'Erreur lors de la recherche', details: findError.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return Response.json({ ok: true, expired_count: 0 })
  }

  // Suspendre chaque boutique
  const ids = expired.map((b: { id: string }) => b.id)
  const { error: updateError } = await supabase
    .from('boutiques')
    .update({ status: 'Suspendu', is_active: false })
    .in('id', ids)

  if (updateError) {
    return Response.json({ error: 'Erreur lors de la suspension', details: updateError.message }, { status: 500 })
  }

  return Response.json({
    ok: true,
    expired_count: expired.length,
    expired_boutiques: expired.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })),
  })
}
