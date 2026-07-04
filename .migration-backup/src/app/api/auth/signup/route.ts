import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidPlan, getFeaturesForPlan, MAX_GERANTS } from '@/lib/plan-features'

// ---------------------------------------------------------------------------
// POST /api/auth/signup
//
// 1. Valide les champs
// 2. Crée l'utilisateur Auth (supabase.auth.signUp)
// 3. Insère le profil dans public.users (service_role pour bypass RLS)
// 4. Insère la boutique dans public.boutiques
// 5. Met à jour public.users.boutique_id
// 6. Nettoie en cas d'échec
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const LOG = (step: string, data?: unknown) =>
    console.log(`[SIGNUP] ${step}`, data ?? '')

  try {
    // ---- ÉTAPE 1 : Parsing du body -------------------------------------------
    const body = await request.json()
    const { email, password, ownerName, boutiqueName, plan } = body
    LOG('Body reçu', { email: email?.substring(0, 3) + '***', hasPassword: !!password, ownerName, boutiqueName })

    if (!email || !password || !ownerName || !boutiqueName) {
      LOG('ÉCHEC : champs requis manquants', { email: !!email, password: !!password, ownerName: !!ownerName, boutiqueName: !!boutiqueName })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      LOG('ÉCHEC : mot de passe trop court', { length: password.length })
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // ---- ÉTAPE 2 : Variables d'environnement ---------------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    LOG('Variables d\'environnement', {
      hasUrl: !!supabaseUrl,
      urlPrefix: supabaseUrl?.substring(0, 20),
      hasServiceKey: !!serviceRoleKey,
      serviceKeyPrefix: serviceRoleKey?.substring(0, 10),
      hasAnonKey: !!supabaseAnonKey,
    })

    if (!supabaseUrl || !serviceRoleKey) {
      LOG('ÉCHEC : variables d\'environnement manquantes')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Client ADMIN (service_role) pour bypasser RLS
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    LOG('Client admin créé (service_role)')

    // ---- ÉTAPE 3 : Création Auth Supabase ------------------------------------
    LOG('Création Auth user...', { email: email.trim().toLowerCase() })
    const { data: authData, error: authError } = await adminClient.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: ownerName } },
    })

    if (authError) {
      LOG('ÉCHEC Auth.signUp', { message: authError.message, code: authError.code, status: authError.status })
      return NextResponse.json(
        { error: authError.message, code: authError.code },
        { status: authError.status ?? 400 }
      )
    }

    if (!authData.user) {
      LOG('ÉCHEC Auth.signUp : aucun user retourné')
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    const uid = authData.user.id
    LOG('Auth user créé', { uid, email: authData.user.email })

    // ---- ÉTAPE 4 : Session ----------------------------------------------------
    // Si une session est retournée (auto-confirm activé), on l'attache
    if (authData.session) {
      const { error: sessionError } = await adminClient.auth.setSession(authData.session)
      if (sessionError) LOG('AVERTISSEMENT setSession', sessionError)
      else LOG('Session attachée au client admin')
    } else {
      LOG('INFO : pas de session (email confirmation requis)')
    }

    // ---- ÉTAPE 5 : Variables communes ------------------------------------------
    const boutiqueId = `boutique_${Date.now()}`
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase()
    const isRoot = superadminEmail ? email.trim().toLowerCase() === superadminEmail : false
    const selectedPlan = isValidPlan(plan) ? plan : 'Basic'
    const permissions = {
      canManageUsers: true, canDeleteSales: true, canManageFeatures: true,
      canViewReports: true, canUseAdvancedIA: true, canExportData: true,
      canManageProducts: true, canManageInventory: true,
    }

    // ---- ÉTAPE 6 : Insertion utilisateur (SANS boutique_id, FK nullable) ----
    const role = isRoot ? 'superadmin' : 'owner'
    LOG('Insertion dans public.users...', { uid, email: email.toLowerCase(), role })
    const { error: userInsertError } = await adminClient.from('users').insert({
      uid,
      email: email.toLowerCase(),
      name: ownerName,
      role,
      boutique_id: null,
      permissions,
      created_at: new Date().toISOString(),
    })

    if (userInsertError) {
      LOG('ÉCHEC insertion users', { message: userInsertError.message, code: userInsertError.code })
      return NextResponse.json(
        { error: `Failed to create user profile: ${userInsertError.message}` },
        { status: 500 }
      )
    }
    LOG('✅ Utilisateur inséré')

    // ---- ÉTAPE 7 : Insertion boutique (owner_id connu, FK utilisateur ok) ----
    LOG('Insertion dans public.boutiques...', { boutiqueId, name: boutiqueName, owner_id: uid, plan: selectedPlan })
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
      LOG('ÉCHEC insertion boutique', { message: boutiqueInsertError.message, code: boutiqueInsertError.code })
      await adminClient.from('users').delete().eq('uid', uid)
      return NextResponse.json(
        { error: `Failed to create boutique: ${boutiqueInsertError.message}` },
        { status: 500 }
      )
    }
    LOG('✅ Boutique insérée')

    // ---- ÉTAPE 8 : Mise à jour boutique_id dans users ------------------------
    LOG('Mise à jour boutique_id dans users...')
    await adminClient.from('users').update({ boutique_id: boutiqueId }).eq('uid', uid)

    // ---- ÉTAPE 9 : Succès ----------------------------------------------------
    LOG('✅ Inscription terminée avec succès', { uid, boutiqueId })
    return NextResponse.json(
      {
        success: true,
        message: 'Inscription réussie',
        pending: !isRoot,
        user: { uid, email: email.toLowerCase(), boutiqueId },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erreur interne'
    console.error('[SIGNUP] Exception non rattrapée:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
