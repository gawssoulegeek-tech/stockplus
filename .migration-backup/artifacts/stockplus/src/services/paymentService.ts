import { SupabaseClient } from '@supabase/supabase-js';
import { Payment, PaginatedResponse } from '@/types/supabase';

export const paymentService = {
  async create(
    supabase: SupabaseClient,
    boutique_id: string,
    data: Partial<Payment>
  ): Promise<Payment> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        ...data,
        boutique_id,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create payment: ${error.message}`);
    return payment;
  },

  async list(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      customer_id?: string;
      debt_id?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<PaginatedResponse<Payment>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.customer_id) query = query.eq('customer_id', options.customer_id);
    if (options?.debt_id) query = query.eq('debt_id', options.debt_id);
    if (options?.from_date) query = query.gte('payment_date', options.from_date);
    if (options?.to_date) query = query.lte('payment_date', options.to_date);

    const { data, count, error } = await query
      .order('payment_date', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list payments: ${error.message}`);

    return {
      data: data || [],
      count: data?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: page * per_page < (count || 0),
      has_previous: page > 1,
    };
  },

  async getByCustomer(
    supabase: SupabaseClient,
    customer_id: string
  ): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select()
      .eq('customer_id', customer_id)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
    return data || [];
  },
};
