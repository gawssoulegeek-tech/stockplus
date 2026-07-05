import { SupabaseClient } from '@supabase/supabase-js';
import { Invitation, PaginatedResponse } from '@/types/supabase';

export const invitationService = {
  async create(
    supabase: SupabaseClient,
    boutique_id: string,
    invited_email: string,
    invited_role: string,
    created_by: string
  ): Promise<Invitation> {
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        boutique_id,
        invited_email,
        invited_role,
        created_by,
        expires_at: expires_at.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create invitation: ${error.message}`);
    return invitation;
  },

  async list(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: { page?: number; per_page?: number; status?: string }
  ): Promise<PaginatedResponse<Invitation>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('invitations')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.status) query = query.eq('status', options.status);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list invitations: ${error.message}`);

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

  async accept(supabase: SupabaseClient, invitationId: string, userId: string): Promise<Invitation> {
    const { data, error } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single();
    if (error) throw new Error(`Failed to accept invitation: ${error.message}`);
    return data;
  },

  async revoke(supabase: SupabaseClient, invitationId: string): Promise<Invitation> {
    const { data, error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .select()
      .single();
    if (error) throw new Error(`Failed to revoke invitation: ${error.message}`);
    return data;
  },
};
