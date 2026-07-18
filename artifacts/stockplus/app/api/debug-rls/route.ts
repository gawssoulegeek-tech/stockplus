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

export async function GET(req: NextRequest) {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase server configuration missing' }, { status: 500 })
  }

  const serverSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll() { return req.cookies.getAll() }, setAll() { } },
  })

  const { data: { user }, error: userError } = await serverSupabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await serverSupabase
    .from('users')
    .select('boutique_id, role, uid')
    .eq('uid', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 })
  }

  const admin = getSupabaseAdminClient()

  // Count sales using admin client (bypasses RLS)
  const { count: adminSaleCount, error: adminErr } = await admin
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('boutique_id', profile.boutique_id)

  // Count sales using anon client (respects RLS) - use the user's token
  const anonClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll() { return req.cookies.getAll() }, setAll() { } },
  })
  const { count: anonSaleCount, error: anonErr } = await anonClient
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('boutique_id', profile.boutique_id)

  // Check if get_current_boutique_id() function works
  let funcResult = null
  let funcErr = null
  try {
    const resp = await anonClient.rpc('get_current_boutique_id')
    funcResult = resp.data
    funcErr = resp.error?.message || null
  } catch (e: any) { funcErr = e.message }

  // Check a sample sale
  const { data: sampleSale, error: sampleErr } = await admin
    .from('sales')
    .select('id, boutique_id, sale_date, total_amount, is_void')
    .eq('boutique_id', profile.boutique_id)
    .limit(5)

  // Check stock_moves
  const { count: stockMoveCount, error: stockErr } = await admin
    .from('stock_moves')
    .select('id', { count: 'exact', head: true })
    .eq('boutique_id', profile.boutique_id)

  // Try direct RLS check: query boutique name using anon client
  const { data: boutiqueCheck, error: boutiqueErr } = await anonClient
    .from('boutiques')
    .select('name')
    .eq('id', profile.boutique_id)
    .single()

  // Check if anon client can read its own user record
  const { data: anonUser, error: anonUserErr } = await anonClient
    .from('users')
    .select('uid, boutique_id')
    .eq('uid', user.id)
    .single()

  // Try various anon queries on sales to pinpoint the issue
  const anonQueries: Record<string, any> = {}
  
  // 1. select * without filter
  try {
    const { data, error, count } = await anonClient
      .from('sales')
      .select('*', { count: 'exact', head: true })
    anonQueries.select_all = { data, count, error: error?.message || null }
  } catch (e: any) { anonQueries.select_all = { error: e.message } }

  // 2. select count with boutique_id filter (different style)
  try {
    const { count, error } = await anonClient
      .from('sales')
      .select('*', { count: 'estimated', head: true })
      .eq('boutique_id', profile.boutique_id)
    anonQueries.estimated_count = { count, error: error?.message || null }
  } catch (e: any) { anonQueries.estimated_count = { error: e.message } }

  // 3. Try using a raw filter with the boutique_id value directly
  try {
    const { count, error } = await anonClient
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('boutique_id', 'boutique_1783732532004')
    anonQueries.literal_filter = { count, error: error?.message || null }
  } catch (e: any) { anonQueries.literal_filter = { error: e.message } }

  return NextResponse.json({
    boutique_id: profile.boutique_id,
    user_id: user.id,
    profile_uid: profile.uid,
    profile_role: profile.role,
    admin_sales_count: adminSaleCount,
    admin_sales_error: adminErr?.message || null,
    anon_sales_count: anonSaleCount,
    anon_sales_error: anonErr?.message || null,
    func_result: funcResult,
    func_error: funcErr,
    sample_sales: sampleSale || [],
    sample_error: sampleErr?.message || null,
    stock_move_count: stockMoveCount,
    stock_move_error: stockErr?.message || null,
    boutique_anon: boutiqueCheck,
    boutique_anon_error: boutiqueErr?.message || null,
    anon_user: anonUser,
    anon_user_error: anonUserErr?.message || null,
    anon_queries: anonQueries,
  })
}
