import { SupabaseClient } from '@supabase/supabase-js';
import { Payment, PaginatedResponse } from '@/types/supabase';

/**
 * [BUG F] Real `payments` schema:
 *   id, boutique_id, sale_id, amount, payment_method, status,
 *   reference, metadata (jsonb), created_at
 *
 * The legacy `Payment` type (and callers like credit.tsx) use fields that
 * don't exist as columns: `customer_id`, `debt_id`, `recorded_by`,
 * `payment_date`, `transaction_reference`, `notes`.
 *
 * Strategy:
 *  - `customer_id`, `debt_id`, `recorded_by`, `notes` are stored inside the
 *    JSONB `metadata` column.
 *  - `transaction_reference` is mapped to the `reference` column.
 *  - `payment_date` is dropped (use `created_at`).
 *  - `sale_id` is passed through when provided.
 */

// Caller-friendly input → DB schema row
function toDbRow(input: Partial<Payment> & Record<string, any>): Record<string, any> {
  const dbRow: Record<string, any> = {};

  // Direct 1:1 schema mappings
  if (input.amount !== undefined) dbRow.amount = input.amount;
  if (input.payment_method !== undefined) dbRow.payment_method = input.payment_method;
  if (input.status !== undefined) dbRow.status = input.status;
  if (input.sale_id !== undefined) dbRow.sale_id = input.sale_id;
  if (input.transaction_reference !== undefined) {
    dbRow.reference = input.transaction_reference;
  } else if (input.reference !== undefined) {
    dbRow.reference = input.reference;
  }

  // Extras packed into `metadata` (JSONB)
  const metadata: Record<string, any> = {};
  if (input.customer_id !== undefined) metadata.customer_id = input.customer_id;
  if (input.debt_id !== undefined) metadata.debt_id = input.debt_id;
  if (input.recorded_by !== undefined) metadata.recorded_by = input.recorded_by;
  if (input.notes !== undefined) metadata.notes = input.notes;
  if (input.payment_date !== undefined) metadata.payment_date = input.payment_date;
  // Preserve any caller-provided metadata (merge)
  if (input.metadata && typeof input.metadata === 'object') {
    Object.assign(metadata, input.metadata);
  }

  if (Object.keys(metadata).length > 0) {
    dbRow.metadata = metadata;
  }

  return dbRow;
}

// DB row → caller-friendly shape (restores legacy field names from metadata)
function fromDbRow(row: any): any {
  if (!row) return row;

  const metadata: any = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {};

  return {
    ...row,
    // Restore legacy field names from DB columns
    transaction_reference: row.reference,
    // Restore extras from metadata JSON
    customer_id: metadata.customer_id,
    debt_id: metadata.debt_id,
    recorded_by: metadata.recorded_by,
    notes: metadata.notes,
    payment_date: metadata.payment_date || row.created_at,
  };
}

export const paymentService = {
  async create(
    supabase: SupabaseClient,
    boutique_id: string,
    data: Partial<Payment>
  ): Promise<Payment> {
    try {
      const dbRow = toDbRow(data);
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          ...dbRow,
          boutique_id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to create payment: ${error.message}`);
      return fromDbRow(payment) as Payment;
    } catch (e: any) {
      console.error('[paymentService.create]', e);
      throw e;
    }
  },

  async list(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      customer_id?: string;
      debt_id?: string;
      sale_id?: string;
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

    // [BUG F] customer_id / debt_id don't exist as columns → filter on metadata JSONB
    if (options?.customer_id) {
      query = query.eq('metadata->>customer_id', options.customer_id);
    }
    if (options?.debt_id) {
      query = query.eq('metadata->>debt_id', options.debt_id);
    }
    if (options?.sale_id) {
      query = query.eq('sale_id', options.sale_id);
    }
    // created_at replaces the legacy payment_date column
    if (options?.from_date) query = query.gte('created_at', options.from_date);
    if (options?.to_date) query = query.lte('created_at', options.to_date);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list payments: ${error.message}`);

    return {
      data: (data || []).map((row: any) => fromDbRow(row)),
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
    try {
      // [BUG F] customer_id lives in metadata JSONB, not as a column
      const { data, error } = await supabase
        .from('payments')
        .select()
        .eq('metadata->>customer_id', customer_id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
      return (data || []).map((row: any) => fromDbRow(row));
    } catch (e: any) {
      console.error('[paymentService.getByCustomer]', e);
      throw e;
    }
  },
};
