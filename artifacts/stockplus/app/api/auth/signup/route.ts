import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { getFeaturesForPlan, MAX_GERANTS } from '@/lib/plan-features'
import { notifySuperadmins } from '@/lib/superadmin-notifications'

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
    } catch (e: any) {
      LOG('ÉCHEC : variables d\'environnement manquantes', e?.message)
      return Response.json({
        error: 'Server configuration error',
        details: e?.message || 'Variables Supabase manquantes côté serveur',
        hint: 'Vérifiez que SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont configurées sur Vercel (Settings → Environment Variables)',
      }, { status: 500 })
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
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase()
    const isRoot = superadminEmail ? normalizedEmail === superadminEmail : false
    const VALID_PLANS = ['Essai', 'Basic', 'Pro'] as const
    const selectedPlan = VALID_PLANS.includes(plan) ? plan : 'Basic'
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
      LOG('ÉCHEC insertion users', { code: userInsertError.code, message: userInsertError.message, details: userInsertError.details, hint: userInsertError.hint })
      // Rollback : supprimer l'Auth user qu'on vient de créer
      await adminClient.auth.admin.deleteUser(uid)
      return Response.json({
        error: `Failed to create user profile: ${userInsertError.message}`,
        code: userInsertError.code,
        details: userInsertError.details,
        hint: userInsertError.hint,
      }, { status: 500 })
    }

    LOG('Insertion dans public.boutiques...', { boutiqueId, boutiqueName })
    // ⚠️ La contrainte CHECK sur boutiques.status n'accepte que certaines valeurs.
    // Au lieu de 'en_attente' (rejeté par le CHECK), on utilise 'Suspendu' qui est valide.
    // Le superadmin pourra approuver via /saas → action 'approve' (passe à 'Essai').
    const { error: boutiqueInsertError } = await adminClient.from('boutiques').insert({
      id: boutiqueId,
      name: boutiqueName,
      owner_id: uid,
      plan: selectedPlan,
      status: isRoot ? 'Actif' : 'Suspendu',
      trial_ends_at: isRoot ? null : trialEndsAt,
      features: getFeaturesForPlan(selectedPlan),
      team_members_count: MAX_GERANTS[selectedPlan] || 1,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    if (boutiqueInsertError) {
      LOG('ÉCHEC insertion boutique', { code: boutiqueInsertError.code, message: boutiqueInsertError.message, details: boutiqueInsertError.details, hint: boutiqueInsertError.hint })
      // Rollback : supprimer le user qu'on vient de créer
      await adminClient.from('users').delete().eq('uid', uid)
      await adminClient.auth.admin.deleteUser(uid)
      return Response.json({
        error: `Failed to create boutique: ${boutiqueInsertError.message}`,
        code: boutiqueInsertError.code,
        details: boutiqueInsertError.details,
        hint: boutiqueInsertError.hint,
      }, { status: 500 })
    }

    await adminClient.from('users').update({ boutique_id: boutiqueId }).eq('uid', uid)

    // ✅ Notifier le superadmin qu'une nouvelle boutique est en attente d'approbation
    // ⚠️ Non-bloquant : si la table notifications n'existe pas, on continue quand même
    if (!isRoot) {
      notifySuperadmins(adminClient, {
        type: 'new_signup',
        title: 'Nouvelle inscription à approuver',
        message: `Boutique "${boutiqueName}" (propriétaire: ${ownerName}, email: ${normalizedEmail}) attend votre approbation.`,
        boutique_id: boutiqueId,
        metadata: { boutiqueId, ownerName, email: normalizedEmail, plan: selectedPlan },
      }).catch((e: unknown) => console.warn('[notifySuperadmins] silent fail:', e))
    }

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
