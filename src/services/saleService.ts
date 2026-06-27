/**
 * Sale Service - Manage sales and transactions
 * Handles POS operations with RLS enforcement
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Sale,
  SaleItem,
  CreateSaleRequest,
  PaginatedResponse,
  PaymentStatus,
} from '@/types/supabase';

export const saleService = {
  /**
   * Create a new sale with items
   * Automatically updates product stock and creates sale_items
   */
  async createSale(
    supabase: SupabaseClient,
    boutique_id: string,
    data: CreateSaleRequest
  ): Promise<{ sale: Sale; items: SaleItem[] }> {
    // Start transaction
    let sale: Sale;
    let items: SaleItem[] = [];

    // Calculate totals
    let subtotal = 0;
    for (const item of data.items) {
      const { data: product } = await supabase
        .from('products')
        .select('price_retail, price_wholesale')
        .eq('id', item.product_id)
        .single();

      if (!product) throw new Error(`Product ${item.product_id} not found`);

      const unit_price = data.sale_type === 'wholesale' && item.is_wholesale_price
        ? product.price_wholesale || product.price_retail
        : product.price_retail;

      subtotal += unit_price * item.quantity;
    }

    const tax_amount = Math.round(subtotal * 0.18); // 18% default tax
    const total_amount = subtotal + tax_amount - (data.discount_amount || 0);

    // Create sale
    const { data: newSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        boutique_id,
        sale_type: data.sale_type,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        invoice_number: data.invoice_number,
        subtotal,
        tax_amount,
        total_amount,
        payment_method: data.payment_method,
        payment_status: data.payment_method === 'credit' ? 'pending' : 'complete',
        discount_amount: data.discount_amount || 0,
        discount_reason: data.discount_reason,
        notes: data.notes,
        is_void: false,
        sale_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saleError) throw new Error(`Failed to create sale: ${saleError.message}`);
    sale = newSale;

    // Create sale items
    for (const item of data.items) {
      const { data: product } = await supabase
        .from('products')
        .select('name, price_retail, price_wholesale')
        .eq('id', item.product_id)
        .single();

      if (!product) continue;

      const unit_price = data.sale_type === 'wholesale' && item.is_wholesale_price
        ? product.price_wholesale || product.price_retail
        : product.price_retail;

      const { data: saleItem, error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          product_id: item.product_id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price,
          is_wholesale_price: item.is_wholesale_price || false,
          item_total: unit_price * item.quantity,
          discount_amount: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (itemError) continue;
      items.push(saleItem);
    }

    return { sale, items };
  },

  /**
   * Get sale by ID with items
   */
  async getSale(
    supabase: SupabaseClient,
    sale_id: string
  ): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select()
      .eq('id', sale_id)
      .single();

    if (saleError) return null;

    const { data: items } = await supabase
      .from('sale_items')
      .select()
      .eq('sale_id', sale_id);

    return { sale, items: items || [] };
  },

  /**
   * List sales for a boutique
   */
  async listSales(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      date_from?: string;
      date_to?: string;
      customer_id?: string;
    }
  ): Promise<PaginatedResponse<Sale>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id)
      .eq('is_void', false);

    if (options?.date_from) {
      query = query.gte('sale_date', options.date_from);
    }

    if (options?.date_to) {
      query = query.lte('sale_date', options.date_to);
    }

    if (options?.customer_id) {
      query = query.eq('customer_id', options.customer_id);
    }

    const { data: sales, count, error } = await query
      .order('sale_date', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list sales: ${error.message}`);

    return {
      data: sales || [],
      count: sales?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: (page * per_page) < (count || 0),
      has_previous: page > 1,
    };
  },

  /**
   * Void a sale
   */
  async voidSale(
    supabase: SupabaseClient,
    sale_id: string,
    reason: string
  ): Promise<Sale> {
    const { data: sale, error } = await supabase
      .from('sales')
      .update({
        is_void: true,
        void_reason: reason,
      })
      .eq('id', sale_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to void sale: ${error.message}`);
    return sale;
  },

  /**
   * Record partial payment for a sale
   */
  async recordPayment(
    supabase: SupabaseClient,
    sale_id: string,
    amount_paid: number
  ): Promise<Sale> {
    const { data: sale } = await supabase
      .from('sales')
      .select()
      .eq('id', sale_id)
      .single();

    if (!sale) throw new Error('Sale not found');

    const new_amount_paid = (sale.amount_paid || 0) + amount_paid;
    const new_status: PaymentStatus =
      new_amount_paid >= sale.total_amount
        ? PaymentStatus.COMPLETE
        : new_amount_paid > 0
          ? PaymentStatus.PARTIAL
          : PaymentStatus.PENDING;

    const { data: updated, error } = await supabase
      .from('sales')
      .update({
        amount_paid: new_amount_paid,
        payment_status: new_status,
      })
      .eq('id', sale_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to record payment: ${error.message}`);
    return updated;
  },

  /**
   * Get daily sales summary
   */
  async getDailySalesSummary(
    supabase: SupabaseClient,
    boutique_id: string,
    date: string
  ): Promise<{
    total_sales: number;
    total_revenue: number;
    transaction_count: number;
    unique_customers: number;
  }> {
    const { data, error } = await supabase
      .from('sales')
      .select('id, total_amount, customer_id')
      .eq('boutique_id', boutique_id)
      .eq('is_void', false)
      .gte('sale_date', `${date}T00:00:00`)
      .lte('sale_date', `${date}T23:59:59`);

    if (error) throw new Error(`Failed to get daily summary: ${error.message}`);

    const sales = data || [];
    const unique_customers = new Set(sales.map(s => s.customer_id)).size;

    return {
      total_sales: sales.length,
      total_revenue: sales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      transaction_count: sales.length,
      unique_customers,
    };
  },
};
