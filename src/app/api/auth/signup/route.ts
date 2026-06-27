import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createUserProfile, createBoutique } from '@/supabase/auth-service'

/**
 * POST /api/auth/signup
 * 
 * Creates a new user account with:
 * 1. Supabase Auth user
 * 2. User profile in users table
 * 3. Boutique in boutiques table with 14-day trial
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, ownerName, boutiqueName } = body

    // Validate input
    if (!email || !password || !ownerName || !boutiqueName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Initialize Supabase client with service role (server-side only)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Create Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError || !authData.user) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { 
          error: authError?.message || 'Failed to create user account',
          code: authError?.code 
        },
        { status: 400 }
      )
    }

    const uid = authData.user.id

    // 2. Create boutique first (to get ID)
    const boutiqueId = await createBoutique(supabase, boutiqueName, uid)

    if (!boutiqueId) {
      // Rollback: Delete the auth user if boutique creation fails
      await supabase.auth.admin.deleteUser(uid)
      return NextResponse.json(
        { error: 'Failed to create boutique' },
        { status: 500 }
      )
    }

    // 3. Create user profile
    const profileCreated = await createUserProfile(
      supabase,
      uid,
      email,
      ownerName,
      boutiqueId
    )

    if (!profileCreated) {
      // Rollback: Delete auth user and boutique if profile creation fails
      await supabase.auth.admin.deleteUser(uid)
      await supabase.from('boutiques').delete().eq('id', boutiqueId)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Success! Return minimal data
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          uid,
          email: email.toLowerCase(),
          boutiqueId,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
