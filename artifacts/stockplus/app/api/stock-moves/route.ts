import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdminClient } from '@/lib/supabase-server'

const getEnvVar = (...keys: string[]) => {
  for (const key of keys) {
    const val = process.env[key]
    if (val && val.trim() !== '') return val
  }
  return undefined
}

export async function POST(req: NextRequest) {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase server configuration missing' }, { status: 500 })
  }

  const serverSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll() {
        return []
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await serverSupabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await serverSupabase
    .from('users')
    .select('boutique_id, role')
    .eq('uid', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Unable to load user profile' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    boutique_id,
    product_id,
    move_type,
    quantity_change,
    reference_type,
    reference_id,
    reason,
    recorded_by,
    notes,
  } = body as {
    boutique_id: string
    product_id: string
    move_type: string
    quantity_change: number
    reference_type?: string
    reference_id?: string
    reason?: string
    recorded_by?: string
    notes?: string
  }

  if (!boutique_id || !product_id || !move_type || typeof quantity_change !== 'number') {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  if (profile.role !== 'superadmin' && profile.boutique_id !== boutique_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = getSupabaseAdminClient()

  const { data: move, error } = await adminClient
    .from('stock_moves')
    .insert({
      boutique_id,
      product_id,
      move_type,
      quantity_change,
      reference_type,
      reference_id,
      reason,
      recorded_by,
      notes,
      move_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !move) {
    return NextResponse.json({ error: `Failed to create stock move: ${error?.message || 'unknown'}` }, { status: 500 })
  }

  return NextResponse.json({ move })
}
