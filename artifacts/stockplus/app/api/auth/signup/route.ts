import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { getFeaturesForPlan, isValidPlan, MAX_GERANTS } from '@/lib/plan-features'

export async function POST(req: NextRequest) {
  const LOG = (step: string, data?: unknown) => console.info(`[SIGNUP] ${step}`, data ?? '')

  try {
    const body = await req.json().catch(() => ({}))
    const { email, password, ownerName, boutiqueName, plan } = body ?? {}
    LOG('Body reçu', { hasEmail: !!email, hasPassword: !!password, ownerName, boutiqueName })

    if (!email || !password || !ownerName || !boutiqueName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (String(password).length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = getSupabaseAdminClient()
    } catch {
      LOG('ÉCHEC : variables d\'environnement manquantes')
      return Response.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    LOG('Création Auth user...', { email: normalizedEmail })
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: ownerName },
    })

    if (authError) {
      LOG('ÉCHEC Auth.createUser', { message: authError.message })
      const status = (authError as { status?: number }).status ?? 400
      const code =
        (authError as { code?: string }).code ??
        (/already.*registered|already.*exists/i.test(authError.message) ? 'user_already_exists' : undefined)
      return Response.json({ error: authError.message, code }, { status })
    }

    if (!authData.user) {
      return Response.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    const uid = authData.user.id
    LOG('Auth user créé', { uid })

    const boutiqueId = `boutique_${Date.now()}`
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase()
    const isRoot = superadminEmail ? normalizedEmail === superadminEmail : false
    const selectedPlan = isValidPlan(plan) ? plan : 'Basic'
    const permissions = {
      canManageUsers: true,
      canDeleteSales: true,
      canManageFeatures: true,
      canViewReports: true,
      canUseAdvancedIA: true,
      canExportData: true,
      canManageProducts: true,
      canManageInventory: true,
    }

    const role = isRoot ? 'superadmin' : 'owner'
    LOG('Insertion dans public.users...', { uid, role })
    const { error: userInsertError } = await adminClient.from('users').insert({
      uid,
      email: normalizedEmail,
      name: ownerName,
      role,
      boutique_id: null,
      permissions,
      created_at: new Date().toISOString(),
    })

    if (userInsertError) {
      LOG('ÉCHEC insertion users', userInsertError)
      return Response.json({ error: `Failed to create user profile: ${userInsertError.message}` }, { status: 500 })
    }

    LOG('Insertion dans public.boutiques...', { boutiqueId, boutiqueName })
    const { error: boutiqueInsertError } = await adminClient.from('boutiques').insert({
      id: boutiqueId,
      name: boutiqueName,
      owner_id: uid,
      plan: selectedPlan,
      status: isRoot ? 'Actif' : 'Essai',
      trial_ends_at: isRoot ? null : trialEndsAt,
      features: getFeaturesForPlan(selectedPlan),
      team_members_count: MAX_GERANTS[selectedPlan] || 1,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    if (boutiqueInsertError) {
      LOG('ÉCHEC insertion boutique', boutiqueInsertError)
      await adminClient.from('users').delete().eq('uid', uid)
      return Response.json({ error: `Failed to create boutique: ${boutiqueInsertError.message}` }, { status: 500 })
    }

    await adminClient.from('users').update({ boutique_id: boutiqueId }).eq('uid', uid)

    LOG('Inscription terminée avec succès', { uid, boutiqueId })
    return Response.json(
      {
        success: true,
        message: 'Inscription réussie',
        pending: !isRoot,
        user: { uid, email: normalizedEmail, boutiqueId },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne'
    console.error('[SIGNUP] Exception non rattrapée', error)
    return Response.json({ error: msg }, { status: 500 })
  }
}
