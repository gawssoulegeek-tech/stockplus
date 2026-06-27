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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 1. Create Auth user via signUp (auto-confirm enabled in Supabase)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
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

    // Create an authenticated client with the user's session
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    if (authData.session) {
      userClient.auth.setSession(authData.session)
    }

    // 2. Create boutique first (to get ID)
    const boutiqueId = await createBoutique(userClient, boutiqueName, uid)

    if (!boutiqueId) {
      return NextResponse.json(
        { error: 'Failed to create boutique' },
        { status: 500 }
      )
    }

    // 3. Create user profile
    const profileCreated = await createUserProfile(
      userClient,
      uid,
      email,
      ownerName,
      boutiqueId
    )

    if (!profileCreated) {
      await userClient.from('boutiques').delete().eq('id', boutiqueId)
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
