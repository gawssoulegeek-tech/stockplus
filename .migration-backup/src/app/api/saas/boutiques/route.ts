import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

async function checkSuperadmin(authHeader: string | null, adminClient: SupabaseClient): Promise<NextResponse | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const { data: profile } = await adminClient.from('users').select('role').eq('uid', user.id).single()
  if (!profile || (profile as any).role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès superadmin requis' }, { status: 403 })
  }
  return null
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authError = await checkSuperadmin(request.headers.get('authorization'), adminClient)
    if (authError) return authError

    const { id, action, ...data } = await request.json()
    if (!id || !action) {
      return NextResponse.json({ error: 'id et action requis' }, { status: 400 })
    }

    switch (action) {
      case 'approve': {
        const { data: bout } = await adminClient.from('boutiques').select('plan').eq('id', id).single()
        if (!bout) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
        await adminClient.from('boutiques').update({
          status: 'Essai',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          team_members_count: 1,
          is_active: true,
        }).eq('id', id)
        return NextResponse.json({ ok: true })
      }
      case 'toggle-status': {
        const { data: boutique } = await adminClient.from('boutiques').select('status').eq('id', id).single()
        if (!boutique) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
        const newStatus = (boutique as any).status === 'Actif' ? 'Suspendu' : 'Actif'
        await adminClient.from('boutiques').update({ status: newStatus }).eq('id', id)
        return NextResponse.json({ ok: true, status: newStatus })
      }
      case 'delete': {
        await adminClient.from('boutiques').delete().eq('id', id)
        return NextResponse.json({ ok: true })
      }
      case 'refuse': {
        await adminClient.from('boutiques').update({ status: 'refuse' }).eq('id', id)
        return NextResponse.json({ ok: true })
      }
      case 'cycle-plan': {
        const { data: bout } = await adminClient.from('boutiques').select('plan, status').eq('id', id).single()
        if (!bout) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
        const b = bout as any
        const PAID_PLANS = ['Basic', 'Pro', 'Premium']
        const currentIndex = PAID_PLANS.indexOf(b.plan)
        const newPlan = currentIndex === -1 ? 'Basic' : PAID_PLANS[(currentIndex + 1) % PAID_PLANS.length]
        await adminClient.from('boutiques').update({
          plan: newPlan,
          status: b.status === 'Essai' ? 'Actif' : b.status,
        }).eq('id', id)
        return NextResponse.json({ ok: true, plan: newPlan })
      }
      case 'activate-payment': {
        const { shopName, paymentId, planToSet } = data as { shopName?: string; paymentId?: string; planToSet?: string }
        if (!shopName || !paymentId) {
          return NextResponse.json({ error: 'shopName et paymentId requis' }, { status: 400 })
        }
        const { data: shops } = await adminClient.from('boutiques').select('id, plan').eq('name', shopName)
        if (!shops || shops.length === 0) {
          return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
        }
        const finalPlan = planToSet || (shops as any)[0].plan
        await adminClient.from('boutiques').update({ status: 'Actif', plan: finalPlan }).eq('name', shopName)
        await adminClient.from('payments').update({ status: 'completed' }).eq('id', paymentId)
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authError = await checkSuperadmin(request.headers.get('authorization'), adminClient)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    if (table === 'audit_logs') {
      const { error } = await adminClient.from('audit_logs').delete().neq('id', 'none')
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Table non prise en charge' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
