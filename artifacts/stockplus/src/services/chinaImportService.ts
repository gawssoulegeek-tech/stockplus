import { SupabaseClient } from '@supabase/supabase-js';
import { ChinaImport, PaginatedResponse } from '@/types/supabase';
import { stockService } from './stockService';

/**
 * [BUG E] Real `china_imports` schema:
 *   id, boutique_id, reference, supplier, total_cost, shipping_cost,
 *   customs_cost, currency, status, estimated_arrival (date),
 *   received_date (date), notes (text), created_at, updated_at
 *
 * The legacy `ChinaImport` type (and the caller inventory-china-import.tsx)
 * use field names that don't exist in the DB: `order_number`, `supplier_name`,
 * `supplier_contact`, `customs_fees`, `total_amount`, `order_date`,
 * `expected_delivery_date`, `actual_delivery_date`, `payment_status`,
 * `amount_paid`, `tracking_number`, `items`.
 *
 * We bridge the two with two mappers (`toDbRow` / `fromDbRow`) so callers
 * keep using the legacy shape, while we only write valid columns to Supabase.
 * Complex extras (items, supplier_contact, total_amount, tracking_number, …)
 * are JSON-encoded into the `notes` text column.
 */

// Caller-friendly input → DB schema row
function toDbRow(input: Partial<ChinaImport> & Record<string, any>): Record<string, any> {
  const dbRow: Record<string, any> = {};

  // Direct 1:1 schema mappings
  if (input.order_number !== undefined) dbRow.reference = input.order_number;
  if (input.supplier_name !== undefined) dbRow.supplier = input.supplier_name;
  if (input.total_cost !== undefined) dbRow.total_cost = input.total_cost;
  if (input.shipping_cost !== undefined) dbRow.shipping_cost = input.shipping_cost;
  if (input.customs_fees !== undefined) dbRow.customs_cost = input.customs_fees;
  if (input.currency !== undefined) dbRow.currency = input.currency;
  if (input.status !== undefined) dbRow.status = input.status;
  if (input.expected_delivery_date !== undefined) {
    dbRow.estimated_arrival = input.expected_delivery_date;
  }
  if (input.actual_delivery_date !== undefined) {
    dbRow.received_date = input.actual_delivery_date;
  }

  // Extras packed into `notes` as JSON
  const extras: Record<string, any> = {};
  if (input.supplier_contact !== undefined) extras.supplier_contact = input.supplier_contact;
  if (input.items !== undefined) extras.items = input.items;
  if (input.total_amount !== undefined) extras.total_amount = input.total_amount;
  if (input.order_date !== undefined) extras.order_date = input.order_date;
  if (input.tracking_number !== undefined) extras.tracking_number = input.tracking_number;
  if (input.payment_status !== undefined) extras.payment_status = input.payment_status;
  if (input.amount_paid !== undefined) extras.amount_paid = input.amount_paid;
  if (input.notes !== undefined) extras.notes = input.notes;

  if (Object.keys(extras).length > 0) {
    dbRow.notes = JSON.stringify(extras);
  }

  return dbRow;
}

// DB row → caller-friendly shape (restores legacy field names + extras)
function fromDbRow(row: any): any {
  if (!row) return row;

  let extras: any = {};
  if (row.notes) {
    try {
      const parsed = JSON.parse(row.notes);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        extras = parsed;
      } else {
        // Not a JSON object → treat as plain text notes
        extras.notes = row.notes;
      }
    } catch {
      // Not JSON → treat as plain text notes
      extras.notes = row.notes;
    }
  }

  return {
    ...row,
    // Restore legacy field names from DB columns
    order_number: row.reference ?? extras.order_number,
    supplier_name: row.supplier ?? extras.supplier_name,
    customs_fees: row.customs_cost ?? extras.customs_fees,
    expected_delivery_date: row.estimated_arrival ?? extras.expected_delivery_date,
    actual_delivery_date: row.received_date ?? extras.actual_delivery_date,
    // Restore extras from notes JSON
    supplier_contact: extras.supplier_contact,
    items: extras.items || [],
    total_amount: extras.total_amount,
    order_date: extras.order_date || row.created_at,
    tracking_number: extras.tracking_number,
    payment_status: extras.payment_status,
    amount_paid: extras.amount_paid,
    notes: extras.notes,
  };
}

export const chinaImportService = {
  async create(
    supabase: SupabaseClient,
    boutique_id: string,
    data: Partial<ChinaImport>
  ): Promise<ChinaImport> {
    try {
      const dbRow = toDbRow(data);
      const { data: imp, error } = await supabase
        .from('china_imports')
        .insert({ ...dbRow, boutique_id, created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(`Failed to create import: ${error.message}`);
      return fromDbRow(imp) as ChinaImport;
    } catch (e: any) {
      console.error('[chinaImportService.create]', e);
      throw e;
    }
  },

  async get(supabase: SupabaseClient, id: string): Promise<ChinaImport | null> {
    try {
      const { data, error } = await supabase
        .from('china_imports')
        .select()
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.warn('[chinaImportService.get]', error.message);
      }
      return data ? (fromDbRow(data) as ChinaImport) : null;
    } catch (e: any) {
      console.error('[chinaImportService.get]', e);
      return null;
    }
  },

  async list(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: { page?: number; per_page?: number; status?: string }
  ): Promise<PaginatedResponse<ChinaImport>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('china_imports')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.status) query = query.eq('status', options.status);

    // [BUG E] order by `created_at` (column exists) instead of legacy `order_date`
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list imports: ${error.message}`);

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

  async update(supabase: SupabaseClient, id: string, data: Partial<ChinaImport>): Promise<ChinaImport> {
    try {
      const dbRow = toDbRow(data);
      const { data: imp, error } = await supabase
        .from('china_imports')
        .update({ ...dbRow, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update import: ${error.message}`);
      return fromDbRow(imp) as ChinaImport;
    } catch (e: any) {
      console.error('[chinaImportService.update]', e);
      throw e;
    }
  },

  async receive(
    supabase: SupabaseClient,
    importId: string,
    deliveryDate: string
  ): Promise<ChinaImport> {
    const imp = await this.get(supabase, importId);
    if (!imp) throw new Error('Import not found');

    // [BUG E] Real columns: `status` → 'received', `received_date` (date) ← deliveryDate.
    // No `payment_status` column exists, so we drop that update.
    const updated = await this.update(supabase, importId, {
      status: 'received' as ChinaImport['status'],
      actual_delivery_date: deliveryDate,
    } as Partial<ChinaImport>);

    const items: Array<{ product_id?: string; quantity?: number }> = (imp as any).items || [];
    for (const item of items) {
      if (!item?.product_id) continue;
      try {
        await stockService.createStockMove(supabase, imp.boutique_id, item.product_id, 'purchase', item.quantity || 0, {
          reference_type: 'import',
          reference_id: importId,
          reason: 'Import reçu',
          notes: `Réception de l'import ${importId} pour ${item.product_id}`,
        });
      } catch (itemErr) {
        console.warn('[chinaImportService.receive] stock move creation failed for an item:', itemErr);
      }
    }

    return updated;
  },
};
