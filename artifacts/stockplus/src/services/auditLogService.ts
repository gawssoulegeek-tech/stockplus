import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLog, PaginatedResponse } from '@/types/supabase';

export const auditLogService = {
  async list(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      action?: string;
      entity_type?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<PaginatedResponse<AuditLog>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 30;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.action) query = query.eq('action', options.action);
    if (options?.entity_type) query = query.eq('entity_type', options.entity_type);
    if (options?.from_date) query = query.gte('created_at', options.from_date);
    if (options?.to_date) query = query.lte('created_at', options.to_date);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list audit logs: ${error.message}`);

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

  async listByEntity(
    supabase: SupabaseClient,
    entity_type: string,
    entity_id: string
  ): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select()
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
    return data || [];
  },
};
