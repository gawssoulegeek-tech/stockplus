/**
 * Product Service - Manage products in Supabase
 * Handles CRUD operations with RLS enforcement
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  CreateProductRequest,
  PaginatedResponse,
} from '@/types/supabase';

export const productService = {
  /**
   * Create a new product
   */
  async createProduct(
    supabase: SupabaseClient,
    boutique_id: string,
    data: CreateProductRequest
  ): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        boutique_id,
        ...data,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create product: ${error.message}`);
    return product;
  },

  /**
   * Get product by ID
   */
  async getProduct(
    supabase: SupabaseClient,
    product_id: string
  ): Promise<Product | null> {
    const { data: product, error } = await supabase
      .from('products')
      .select()
      .eq('id', product_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return product || null;
  },

  /**
   * List products for a boutique (with pagination)
   */
  async listProducts(
    supabase: SupabaseClient,
    boutique_id: string,
    options?: {
      page?: number;
      per_page?: number;
      search?: string;
      category?: string;
      is_active?: boolean;
    }
  ): Promise<PaginatedResponse<Product>> {
    const page = options?.page || 1;
    const per_page = options?.per_page || 20;
    const start = (page - 1) * per_page;
    const end = start + per_page - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('boutique_id', boutique_id);

    if (options?.search) {
      query = query.or(
        `name.ilike.%${options.search}%,sku.ilike.%${options.search}%`
      );
    }

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.is_active !== undefined) {
      query = query.eq('is_active', options.is_active);
    }

    const { data: products, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw new Error(`Failed to list products: ${error.message}`);

    return {
      data: products || [],
      count: products?.length || 0,
      total: count || 0,
      page,
      per_page,
      has_next: (page * per_page) < (count || 0),
      has_previous: page > 1,
    };
  },

  /**
   * Update product
   */
  async updateProduct(
    supabase: SupabaseClient,
    product_id: string,
    data: Partial<Product>
  ): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', product_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product: ${error.message}`);
    return product;
  },

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(supabase: SupabaseClient, boutique_id: string, product_id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', product_id)
      .eq('boutique_id', boutique_id);

    if (error) throw new Error(`Failed to delete product: ${error.message}`);
  },

  /**
   * Update product stock quantity
   */
  async updateStockQuantity(
    supabase: SupabaseClient,
    product_id: string,
    new_quantity: number
  ): Promise<Product> {
    const { data: product, error } = await supabase
      .from('products')
      .update({
        quantity_in_stock: new_quantity,
        updated_at: new Date().toISOString(),
        last_restocked_at: new Date().toISOString(),
      })
      .eq('id', product_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update stock: ${error.message}`);
    return product;
  },

  /**
   * Get product by SKU
   */
  async getProductBySku(
    supabase: SupabaseClient,
    boutique_id: string,
    sku: string
  ): Promise<Product | null> {
    const { data: product, error } = await supabase
      .from('products')
      .select()
      .eq('boutique_id', boutique_id)
      .eq('sku', sku)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch product by SKU: ${error.message}`);
    }

    return product || null;
  },

  /**
   * Bulk create products
   */
  async bulkCreateProducts(
    supabase: SupabaseClient,
    boutique_id: string,
    products: CreateProductRequest[]
  ): Promise<{ success: Product[]; failed: Array<{ data: CreateProductRequest; error: string }> }> {
    const success: Product[] = [];
    const failed: Array<{ data: CreateProductRequest; error: string }> = [];

    for (const product of products) {
      try {
        const created = await this.createProduct(supabase, boutique_id, product);
        success.push(created);
      } catch (error) {
        failed.push({
          data: product,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed };
  },
};
