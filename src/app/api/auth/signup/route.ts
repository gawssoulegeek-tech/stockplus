import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { email, password, ownerName, boutiqueName } = body
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

    // ---- ÉTAPE 5 : Insertion dans public.users --------------------------------
    const boutiqueId = `boutique_${Date.now()}`
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const role = email === 'root@senestock.ai' ? 'superadmin' : 'owner'
    const permissions = {
      canManageUsers: true, canDeleteSales: true, canManageFeatures: true,
      canViewReports: true, canUseAdvancedIA: true, canExportData: true,
      canManageProducts: true, canManageInventory: true,
    }

    LOG('Insertion dans public.users...', { uid, email: email.toLowerCase(), role, boutiqueId })
    const { error: userInsertError } = await adminClient.from('users').insert({
      uid,
      email: email.toLowerCase(),
      name: ownerName,
      role,
      boutique_id: boutiqueId,
      permissions,
      created_at: new Date().toISOString(),
    })

    if (userInsertError) {
      LOG('ÉCHEC insertion users', { message: userInsertError.message, code: userInsertError.code, details: userInsertError.details })
      return NextResponse.json(
        { error: `Failed to create user profile: ${userInsertError.message}` },
        { status: 500 }
      )
    }
    LOG('✅ Utilisateur inséré dans public.users')

    // ---- ÉTAPE 6 : Insertion dans public.boutiques ---------------------------
    LOG('Insertion dans public.boutiques...', { boutiqueId, name: boutiqueName, owner_id: uid })
    const { error: boutiqueInsertError } = await adminClient.from('boutiques').insert({
      id: boutiqueId,
      name: boutiqueName,
      owner_id: uid,
      plan: 'Essai',
      status: 'Essai',
      trial_ends_at: trialEndsAt,
      features: {
        wholesale: false, credit: false, customers: false, units: false,
        chinaImport: false, advancedReports: false, multiCart: false,
        stockIncrement: true,
      },
      team_members_count: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    })

    if (boutiqueInsertError) {
      LOG('ÉCHEC insertion boutiques', { message: boutiqueInsertError.message, code: boutiqueInsertError.code, details: boutiqueInsertError.details })
      // Rollback : supprimer l'utilisateur
      await adminClient.from('users').delete().eq('uid', uid)
      return NextResponse.json(
        { error: `Failed to create boutique: ${boutiqueInsertError.message}` },
        { status: 500 }
      )
    }
    LOG('✅ Boutique insérée dans public.boutiques')

    // ---- ÉTAPE 7 : Mise à jour boutique_id dans users ------------------------
    LOG('Mise à jour boutique_id dans users...')
    const { error: userUpdateError } = await adminClient
      .from('users')
      .update({ boutique_id: boutiqueId })
      .eq('uid', uid)

    if (userUpdateError) {
      LOG('AVERTISSEMENT : échec update boutique_id', userUpdateError)
      // Non bloquant, le boutique_id est déjà positionné dans l'insert
    } else {
      LOG('✅ boutique_id mis à jour')
    }

    // ---- ÉTAPE 8 : Succès ----------------------------------------------------
    LOG('✅ Inscription terminée avec succès', { uid, boutiqueId })
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: { uid, email: email.toLowerCase(), boutiqueId },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[SIGNUP] Exception non rattrapée:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
