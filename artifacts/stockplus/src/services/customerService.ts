/**
 * Customer Service - Manage customers and debts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Customer,
  Debt,
  CreateCustomerRequest,
  PaginatedResponse,
  DebtStatus,
} from '@/types/supabase';

export const customerService = {
  /**
   * Create a new customer
   */
  async createCustomer(
    supabase: SupabaseClient,
    boutique_id: string,
    data: CreateCustomerRequest
  ): Promise<Customer> {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        boutique_id,
        ...data,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create customer: ${error.message}`);
    return customer;
  },

  /**
   * Get customer by ID
   */
  async getCustomer(
    supabase: SupabaseClient,
    customer_id: string
  ): Promise<Customer | null> {
    const { data: customer, error } = await supabase
      .from('customers')
      .select()
      .eq('id', customer_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch customer: ${error.message}`);
    }

    return customer || null;
  },

  /**
   * List customers for a boutique
   */
  async listCustomers(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      search?: string;
      is_active?: boolean;
    }
  ): Promise<PaginatedResponse<Customer>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.search) {
      query = query.or(
        `full_name.ilike.%${options.search}%,phone_number.ilike.%${options.search}%,email.ilike.%${options.search}%`
      );
    }

    if (options?.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }

    const { data: customers, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list customers: ${error.message}`);

    return {
      data: customers || [],
      count: customers?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: (page * per_page) < (count || 0),
      has_previous: page > 1,
    };
  },

  /**
   * Update customer
   */
  async updateCustomer(
    supabase: SupabaseClient,
    customer_id: string,
    data: Partial<Customer>
  ): Promise<Customer> {
    const { data: customer, error } = await supabase
      .from('customers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', customer_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update customer: ${error.message}`);
    return customer;
  },

  /**
   * Create debt for customer
   */
  async createDebt(
    supabase: SupabaseClient,
    boutique_id: string,
    customer_id: string,
    amount: number,
    reason?: string
  ): Promise<Debt> {
    const { data: debt, error } = await supabase
      .from('debts')
      .insert({
        boutique_id,
        customer_id,
        original_amount: amount,
        remaining_amount: amount,
        status: 'active',
        reason,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create debt: ${error.message}`);
    return debt;
  },

  /**
   * Get customer debts
   */
  async getCustomerDebts(
    supabase: SupabaseClient,
    customer_id: string,
    status?: DebtStatus
  ): Promise<Debt[]> {
    let query = supabase
      .from('debts')
      .select()
      .eq('customer_id', customer_id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: debts, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get customer debts: ${error.message}`);
    return debts || [];
  },

  /**
   * Record debt payment
   */
  async recordDebtPayment(
    supabase: SupabaseClient,
    debt_id: string,
    amount: number
  ): Promise<Debt> {
    const { data: debt } = await supabase
      .from('debts')
      .select()
      .eq('id', debt_id)
      .single();

    if (!debt) throw new Error('Debt not found');

    const new_remaining = debt.remaining_amount - amount;
    const new_status: DebtStatus =
      new_remaining <= 0 ? DebtStatus.PAID : new_remaining < debt.original_amount ? DebtStatus.PARTIAL : DebtStatus.ACTIVE;

    const { data: updated, error } = await supabase
      .from('debts')
      .update({
        remaining_amount: Math.max(0, new_remaining),
        status: new_status,
        paid_at: new_remaining <= 0 ? new Date().toISOString() : debt.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debt_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to record payment: ${error.message}`);
    return updated;
  },

  /**
   * Get customer total debt
   */
  async getCustomerTotalDebt(
    supabase: SupabaseClient,
    customer_id: string
  ): Promise<number> {
    const { data: debts, error } = await supabase
      .from('debts')
      .select('remaining_amount')
      .eq('customer_id', customer_id)
      .neq('status', 'paid');

    if (error) throw new Error(`Failed to calculate total debt: ${error.message}`);

    return (debts || []).reduce((sum, d) => sum + (d.remaining_amount || 0), 0);
  },

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(supabase: SupabaseClient, customer_id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', customer_id);

    if (error) throw new Error(`Failed to delete customer: ${error.message}`);
  },
};
