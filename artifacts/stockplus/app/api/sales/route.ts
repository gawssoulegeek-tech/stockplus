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
    sale_type,
    customer_id,
    customer_name,
    invoice_number,
    payment_method,
    seller_name,
    discount_amount,
    discount_reason,
    notes,
    items,
  } = body as {
    boutique_id: string
    sale_type: string
    customer_id?: string
    customer_name?: string
    invoice_number?: string
    payment_method: string
    seller_name?: string
    discount_amount?: number
    discount_reason?: string
    notes?: string
    items: Array<{ product_id: string; quantity: number; is_wholesale_price?: boolean }>
  }

  if (!boutique_id || !sale_type || !payment_method || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  if (profile.role !== 'superadmin' && profile.boutique_id !== boutique_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = getSupabaseAdminClient()

  const productIds = Array.from(new Set(items.map((item) => item.product_id)))
  const { data: products, error: productsError } = await adminClient
    .from('products')
    .select('id, name, price_retail, price_wholesale, quantity_in_stock')
    .in('id', productIds)
    .eq('boutique_id', boutique_id)

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'One or more products are invalid or unavailable' }, { status: 400 })
  }

  const productMap = new Map<string, any>()
  products.forEach((product) => productMap.set(product.id, product))

  let subtotal = 0
  const saleItemsPayload = items.map((item) => {
    const product = productMap.get(item.product_id)
    if (!product) return null

    const unit_price = item.is_wholesale_price && product.price_wholesale
      ? product.price_wholesale
      : product.price_retail

    const itemTotal = unit_price * item.quantity
    subtotal += itemTotal

    return {
      sale_id: null,
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price,
      is_wholesale_price: item.is_wholesale_price || false,
      item_total: itemTotal,
      discount_amount: 0,
      created_at: new Date().toISOString(),
    }
  })

  if (saleItemsPayload.some((item) => item === null)) {
    return NextResponse.json({ error: 'Invalid product items payload' }, { status: 400 })
  }

  const tax_amount = Math.round(subtotal * 0.18)
  const total_amount = subtotal + tax_amount - (discount_amount || 0)

  const { data: newSale, error: saleError } = await adminClient
    .from('sales')
    .insert({
      boutique_id,
      sale_type,
      customer_id,
      customer_name,
      invoice_number,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      payment_status: payment_method === 'credit' ? 'pending' : 'complete',
      discount_amount: discount_amount || 0,
      discount_reason,
      notes,
      seller_name,
      is_void: false,
      sale_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (saleError || !newSale) {
    return NextResponse.json({ error: `Failed to create sale: ${saleError?.message || 'unknown'}` }, { status: 500 })
  }

  const saleItemsToInsert = saleItemsPayload.map((item) => ({
    ...item,
    sale_id: newSale.id,
  }))

  const { data: insertedItems, error: itemsError } = await adminClient
    .from('sale_items')
    .insert(saleItemsToInsert)
    .select()

  if (itemsError) {
    return NextResponse.json({ error: `Failed to create sale items: ${itemsError.message}` }, { status: 500 })
  }

  const stockMovePayload = items.map((item) => {
    const product = productMap.get(item.product_id)
    return {
      boutique_id,
      product_id: item.product_id,
      move_type: 'sale',
      quantity_change: -item.quantity,
      reference_type: 'sale',
      reference_id: newSale.id,
      reason: `Vente ${invoice_number || newSale.id}`,
      notes: `Vente enregistrée - ${item.quantity} unité(s)`,
      move_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
  })

  const { error: stockMoveError } = await adminClient
    .from('stock_moves')
    .insert(stockMovePayload)

  if (stockMoveError) {
    return NextResponse.json({ error: `Failed to create stock moves: ${stockMoveError.message}` }, { status: 500 })
  }

  const updatePromises = items.map((item) => {
    const product = productMap.get(item.product_id)
    const nextQty = Math.max(0, (product.quantity_in_stock || 0) - item.quantity)
    return adminClient
      .from('products')
      .update({ quantity_in_stock: nextQty })
      .eq('id', item.product_id)
  })

  await Promise.all(updatePromises)

  return NextResponse.json({ sale: newSale, items: insertedItems || [] })
}
