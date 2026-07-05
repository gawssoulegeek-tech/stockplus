import { SupabaseClient } from '@supabase/supabase-js'

export interface SignUpData {
  email: string
  password: string
  ownerName: string
  boutiqueName: string
}

export interface AuthResponse {
  success: boolean
  message: string
  error?: string
}

export interface UserProfile {
  uid: string
  email: string
  name: string
  role: 'owner' | 'manager' | 'superadmin'
  boutique_id?: string
  created_at: string
}

export interface BoutiqueData {
  id: string
  name: string
  owner_id: string
  plan: 'Essai' | 'Basic' | 'Pro' | 'Premium'
  status: 'Essai' | 'Actif' | 'Suspendu'
  trial_ends_at: string
  features: {
    units: boolean
    wholesale: boolean
    credit: boolean
    customers: boolean
    stockIncrement: boolean
    historicalMoves: boolean
    importChina: boolean
    chinaImport?: boolean
    advancedReports?: boolean
    multiCart?: boolean
    supplierInvoiceScan?: boolean
  }
  created_at: string
}

/**
 * Sign in user with email and password
 */
export async function signInUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      return {
        success: false,
        message: 'Erreur de connexion',
        error: error.message,
      }
    }

    return {
      success: true,
      message: 'Connexion réussie',
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur de connexion',
      error: error.message,
    }
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(supabase: SupabaseClient): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        message: 'Erreur de déconnexion',
        error: error.message,
      }
    }

    return {
      success: true,
      message: 'Déconnexion réussie',
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur de déconnexion',
      error: error.message,
    }
  }
}

/**
 * Request password reset email
 */
export async function resetPassword(
  supabase: SupabaseClient,
  email: string
): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      }
    )

    if (error) {
      return {
        success: false,
        message: 'Erreur lors de la réinitialisation',
        error: error.message,
      }
    }

    return {
      success: true,
      message: 'Email de réinitialisation envoyé',
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Erreur lors de la réinitialisation',
      error: error.message,
    }
  }
}

/**
 * Get current user profile from users table
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  uid: string
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single()

    if (error || !data) {
      console.warn('User profile not found:', error)
      return null
    }

    return {
      uid: data.uid,
      email: data.email,
      name: data.name,
      role: data.role,
      boutique_id: data.boutique_id,
      created_at: data.created_at,
    }
  } catch (error: any) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Get boutique data for owner
 */
export async function getBoutique(
  supabase: SupabaseClient,
  boutiqueId: string
): Promise<BoutiqueData | null> {
  try {
    const { data, error } = await supabase
      .from('boutiques')
      .select('*')
      .eq('id', boutiqueId)
      .single()

    if (error || !data) {
      console.warn('Boutique not found:', error)
      return null
    }

    return data as BoutiqueData
  } catch (error: any) {
    console.error('Error fetching boutique:', error)
    return null
  }
}

/**
 * Create user profile (called after Supabase Auth signup)
 * This should typically be called from a server action/route handler
 */
export async function createUserProfile(
  supabase: SupabaseClient,
  uid: string,
  email: string,
  name: string,
  boutiqueId: string
): Promise<boolean> {
  try {
    const role = 'owner'

    console.log('[createUserProfile] Inserting user:', { uid, email: email.toLowerCase(), name, role, boutiqueId })
    const { error } = await supabase.from('users').insert([
      {
        uid,
        email: email.toLowerCase(),
        name,
        role,
        boutique_id: boutiqueId,
        created_at: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error('[createUserProfile] Error:', { message: error.message, code: error.code, details: error.details })
      return false
    }

    console.log('[createUserProfile] Success:', uid)
    return true
  } catch (error: any) {
    console.error('Error creating user profile:', error)
    return false
  }
}

/**
 * Create boutique with trial period
 * This should typically be called from a server action/route handler
 */
export async function createBoutique(
  supabase: SupabaseClient,
  name: string,
  ownerId: string
): Promise<string | null> {
  try {
    const boutiqueId = `boutique_${Date.now()}`
    
    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const boutiqueData = {
      id: boutiqueId,
      name,
      owner_id: ownerId,
      plan: 'Essai',
      status: 'Essai',
      trial_ends_at: trialEndsAt.toISOString(),
      features: {
        wholesale: false,
        credit: false,
        customers: false,
        units: false,
        chinaImport: false,
        advancedReports: false,
        multiCart: false,
        stockIncrement: true,
      },
      team_members_count: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    console.log('[createBoutique] Inserting boutique:', { boutiqueId, name, ownerId })
    const { error } = await supabase.from('boutiques').insert([boutiqueData])

    if (error) {
      console.error('[createBoutique] Error:', { message: error.message, code: error.code, details: error.details })
      return null
    }

    console.log('[createBoutique] Success:', boutiqueId)
    return boutiqueId
  } catch (error: any) {
    console.error('Error creating boutique:', error)
    return null
  }
}
