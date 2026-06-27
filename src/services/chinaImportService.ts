import { SupabaseClient } from '@supabase/supabase-js';
import { ChinaImport, PaginatedResponse } from '@/types/supabase';

export const chinaImportService = {
  async create(
    supabase: SupabaseClient,
    boutique_id: string,
    data: Partial<ChinaImport>
  ): Promise<ChinaImport> {
    const { data: imp, error } = await supabase
      .from('china_imports')
      .insert({ ...data, boutique_id, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(`Failed to create import: ${error.message}`);
    return imp;
  },

  async get(supabase: SupabaseClient, id: string): Promise<ChinaImport | null> {
    const { data, error } = await supabase
      .from('china_imports')
      .select()
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`Failed to fetch import: ${error.message}`);
    return data || null;
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

    const { data, count, error } = await query
      .order('order_date', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list imports: ${error.message}`);

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

  async update(supabase: SupabaseClient, id: string, data: Partial<ChinaImport>): Promise<ChinaImport> {
    const { data: imp, error } = await supabase
      .from('china_imports')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update import: ${error.message}`);
    return imp;
  },

  async receive(
    supabase: SupabaseClient,
    importId: string,
    deliveryDate: string
  ): Promise<ChinaImport> {
    const imp = await this.get(supabase, importId);
    if (!imp) throw new Error('Import not found');

    const updated = await this.update(supabase, importId, {
      status: 'received' as ChinaImport['status'],
      actual_delivery_date: deliveryDate,
      payment_status: 'paid' as ChinaImport['payment_status'],
    });

    for (const item of imp.items) {
      await supabase.from('stock_moves').insert({
        boutique_id: imp.boutique_id,
        product_id: imp.id,
        move_type: 'purchase',
        quantity_change: item.quantity,
        reference_type: 'import',
        reference_id: importId,
        move_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return updated;
  },
};
