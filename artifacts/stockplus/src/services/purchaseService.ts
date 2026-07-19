import { SupabaseClient } from '@supabase/supabase-js'
import { Supplier, Purchase, PurchaseItem, CreateSupplierRequest, CreatePurchaseRequest, PaginatedResponse } from '@/types/supabase'

export const purchaseService = {

  // ── Suppliers ──

  async createSupplier(supabase: SupabaseClient, boutique_id: string, data: CreateSupplierRequest): Promise<Supplier> {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({ boutique_id, ...data, is_active: true, created_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw new Error(`Failed to create supplier: ${error.message}`)
    return supplier
  },

  async listSuppliers(supabase: SupabaseClient, boutique_id: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('boutique_id', boutique_id)
      .eq('is_active', true)
      .order('name')
    if (error) throw new Error(`Failed to list suppliers: ${error.message}`)
    return data || []
  },

  async updateSupplier(supabase: SupabaseClient, id: string, data: Partial<Supplier>): Promise<Supplier> {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update supplier: ${error.message}`)
    return supplier
  },

  async deleteSupplier(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('suppliers').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw new Error(`Failed to delete supplier: ${error.message}`)
  },

  // ── Purchases ──

  async createPurchase(supabase: SupabaseClient, boutique_id: string, data: CreatePurchaseRequest): Promise<Purchase> {
    const total_amount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        boutique_id,
        supplier_id: data.supplier_id || null,
        supplier_name: data.supplier_name || null,
        reference: data.reference || null,
        total_amount,
        status: 'ordered',
        notes: data.notes || null,
        order_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (purchaseError) throw new Error(`Failed to create purchase: ${purchaseError.message}`)

    const items = data.items.map(item => ({
      purchase_id: purchase.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from('purchase_items').insert(items)
    if (itemsError) throw new Error(`Failed to create purchase items: ${itemsError.message}`)

    return purchase
  },

  async listPurchases(supabase: SupabaseClient, boutique_id: string, options?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Purchase>> {
    const page = options?.page || 1
    const per_page = options?.per_page || 20
    const start = (page - 1) * per_page
    const end = start + per_page - 1

    const { data, count, error } = await supabase
      .from('purchases')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id)
      .order('order_date', { ascending: false })
      .range(start, end)

    if (error) throw new Error(`Failed to list purchases: ${error.message}`)

    return {
      data: data || [],
      count: data?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: (page * per_page) < (count || 0),
      has_previous: page > 1,
    }
  },

  async getPurchase(supabase: SupabaseClient, id: string): Promise<{ purchase: Purchase; items: PurchaseItem[] } | null> {
    const { data: purchase, error: pError } = await supabase.from('purchases').select().eq('id', id).single()
    if (pError) return null

    const { data: items } = await supabase.from('purchase_items').select().eq('purchase_id', id)
    return { purchase, items: items || [] }
  },

  async updatePurchaseStatus(supabase: SupabaseClient, id: string, status: string, receivedDate?: string): Promise<Purchase> {
    const updateData: any = { status, updated_at: new Date().toISOString() }
    if (receivedDate) updateData.received_date = receivedDate
    const { data, error } = await supabase.from('purchases').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(`Failed to update purchase: ${error.message}`)
    return data
  },
}
