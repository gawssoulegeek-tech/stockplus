import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { boutiqueId, emailReports } = await request.json()
    if (!boutiqueId) {
      return NextResponse.json({ error: 'boutiqueId requis' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('uid', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'Profil utilisateur introuvable' }, { status: 403 })
    }

    const { data: boutique } = await adminClient
      .from('boutiques')
      .select('owner_id')
      .eq('id', boutiqueId)
      .single()

    if (!boutique) {
      return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
    }

    if (userProfile.role !== 'superadmin' && boutique.owner_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé à cette boutique' }, { status: 403 })
    }

    const { data: currentBoutique } = await adminClient
      .from('boutiques')
      .select('notifications')
      .eq('id', boutiqueId)
      .single()

    const current = (currentBoutique?.notifications || {}) as Record<string, unknown>

    const { error } = await adminClient
      .from('boutiques')
      .update({ notifications: { ...current, emailReports } })
      .eq('id', boutiqueId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, emailReports })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
