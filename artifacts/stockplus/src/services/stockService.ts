/**
 * Stock Service - Manage inventory movements
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  StockMove,
  StockMoveType,
  PaginatedResponse,
} from '@/types/supabase';

export const stockService = {
  /**
   * Create a stock movement
   */
  async createStockMove(
    supabase: SupabaseClient,
    boutique_id: string,
    product_id: string,
    move_type: StockMoveType,
    quantity_change: number,
    options?: {
      reference_type?: string;
      reference_id?: string;
      reason?: string;
      recorded_by?: string;
      notes?: string;
    }
  ): Promise<StockMove> {
    const response = await fetch('/api/stock-moves', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        boutique_id,
        product_id,
        move_type,
        quantity_change,
        reference_type: options?.reference_type,
        reference_id: options?.reference_id,
        reason: options?.reason,
        recorded_by: options?.recorded_by,
        notes: options?.notes,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message = payload?.error || payload?.message || response.statusText || 'Failed to create stock move'
      throw new Error(message)
    }

    if (!payload || !payload.move) {
      throw new Error('Invalid response from stock-moves API')
    }

    return payload.move
  },

  /**
   * Get stock movement history for product
   */
  async getProductStockHistory(
    supabase: SupabaseClient,
    product_id: string,
    options?: {
      page?: number;
      per_page?: number;
      move_type?: StockMoveType;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<PaginatedResponse<StockMove>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('stock_moves')
      .select('*', { count: 'exact' })
      .eq('product_id', product_id);

    if (options?.move_type) {
      query = query.eq('move_type', options.move_type);
    }

    if (options?.from_date) {
      query = query.gte('move_date', options.from_date);
    }

    if (options?.to_date) {
      query = query.lte('move_date', options.to_date);
    }

    const { data: moves, count, error } = await query
      .order('move_date', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to get stock history: ${error.message}`);

    return {
      data: moves || [],
      count: moves?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: (page * per_page) < (count || 0),
      has_previous: page > 1,
    };
  },

  /**
   * Get stock movements by boutique
   */
  async getBoutiqueStockMoves(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      move_type?: StockMoveType;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<PaginatedResponse<StockMove>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('stock_moves')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.move_type) {
      query = query.eq('move_type', options.move_type);
    }

    if (options?.from_date) {
      query = query.gte('move_date', options.from_date);
    }

    if (options?.to_date) {
      query = query.lte('move_date', options.to_date);
    }

    const { data: moves, count, error } = await query
      .order('move_date', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to get stock moves: ${error.message}`);

    return {
      data: moves || [],
      count: moves?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: (page * per_page) < (count || 0),
      has_previous: page > 1,
    };
  },

  /**
   * Get stock movement statistics
   */
  async getStockStats(
    supabase: SupabaseClient,
    boutique_id: string,
    from_date?: string,
    to_date?: string
  ): Promise<{
    purchase: number;
    sale: number;
    adjustment: number;
    return: number;
    damage: number;
  }> {
    let query = supabase
      .from('stock_moves')
      .select('move_type')
      .eq('boutique_id', boutique_id);

    if (from_date) query = query.gte('move_date', from_date);
    if (to_date) query = query.lte('move_date', to_date);

    const { data: moves, error } = await query;

    if (error) throw new Error(`Failed to get stock stats: ${error.message}`);

    // Clés alignées sur les valeurs d'enum StockMoveType (singulier)
    const stats = {
      purchase: 0,
      sale: 0,
      adjustment: 0,
      return: 0,
      damage: 0,
    };

    (moves || []).forEach(move => {
      const key = move.move_type as keyof typeof stats;
      if (key in stats) {
        stats[key]++;
      }
    });

    return stats;
  },
};
