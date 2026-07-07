import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { requireSuperadmin } from '@/lib/api-auth'

/**
 * GET /api/superadmin/notifications
 * Récupère les notifications du superadmin connecté.
 *
 * Query params:
 *   - unread_only=true : ne renvoyer que les notifications non lues
 *   - limit=50 : nombre max (défaut 50)
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin(req)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread_only') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  let adminClient
  try {
    adminClient = getSupabaseAdminClient()
  } catch {
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  let query = adminClient
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  // ⚠️ Si la table notifications n'existe pas, on retourne une liste vide
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('Could not find the table') || error.code === '42P01' || error.code === 'PGRST106') {
      return Response.json({
        notifications: [],
        unread_count: 0,
        warning: 'Table notifications inexistante. Exécutez la migration 002_create_notifications_table.sql',
      })
    }
    return Response.json({ error: 'Erreur lors de la récupération', details: error.message }, { status: 500 })
  }

  // Compter les non lues
  const { count: unreadCount, error: countErr } = await adminClient
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  // Si erreur de count (table inexistante), on retourne 0
  const finalUnreadCount = countErr ? 0 : (unreadCount || 0)

  return Response.json({
    notifications: data || [],
    unread_count: finalUnreadCount,
  })
}

/**
 * PATCH /api/superadmin/notifications
 * Marquer une notification comme lue (ou toutes comme lues).
 * Body: { id: "uuid" } ou { mark_all: true }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin(req)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  let adminClient
  try {
    adminClient = getSupabaseAdminClient()
  } catch {
    return Response.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))

  if (body.mark_all) {
    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)
    if (error) {
      // Table inexistante → on renvoie OK quand même (pas de notifications = rien à marquer)
      if (error.message.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST106') {
        return Response.json({ ok: true, marked: 'all', warning: 'Table inexistante' })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ ok: true, marked: 'all' })
  }

  if (body.id) {
    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST106') {
        return Response.json({ ok: true, marked: body.id, warning: 'Table inexistante' })
      }
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ ok: true, marked: body.id })
  }

  return Response.json({ error: 'id ou mark_all requis' }, { status: 400 })
}
