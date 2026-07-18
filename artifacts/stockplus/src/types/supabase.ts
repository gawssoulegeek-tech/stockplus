/**
 * TypeScript Type Definitions for StockPlus Database Schema
 * Generated from PostgreSQL schema in Supabase
 *
 * Use these types for API requests/responses and component props
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export enum UserRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  STAFF = 'staff',
  SUPERADMIN = 'superadmin'
}

export enum BoutiquePlan {
  TRIAL = 'Essai',
  BASIC = 'Basic',
  PRO = 'Pro',
  PREMIUM = 'Premium'
}

export enum BoutiqueStatus {
  TRIAL = 'Essai',
  ACTIVE = 'Actif',
  SUSPENDED = 'Suspendu'
}

export enum SaleType {
  RETAIL = 'retail',
  WHOLESALE = 'wholesale'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  CREDIT = 'credit',
  MOBILE = 'mobile'
}

export enum PaymentStatus {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  PENDING = 'pending'
}

export enum CustomerType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business'
}

export enum DebtStatus {
  ACTIVE = 'active',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum StockMoveType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  DAMAGE = 'damage'
}

export enum ImportStatus {
  ORDERED = 'ordered',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  RECEIVED = 'received',
  CANCELLED = 'cancelled'
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REVOKED = 'revoked'
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export'
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning'
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User Profile (Extended user information)
 */
export interface UserProfile {
  id: string                    // UUID from auth.users
  full_name?: string
  avatar_url?: string
  phone_number?: string
  language: string              // 'fr' | 'en'
  timezone: string
  email_notifications: boolean
  push_notifications: boolean
  last_login_at?: string        // ISO 8601
  last_activity_at: string      // ISO 8601
  created_at: string
  updated_at?: string
}

/**
 * User (Auth + Profile + Boutique reference)
 */
export interface User extends UserProfile {
  email: string
  role: UserRole
  boutique_id?: string          // FK to boutiques.id
  permissions?: Permissions
}

/**
 * Boutique
 */
export interface Boutique {
  id: string                    // boutique_TIMESTAMP
  name: string
  owner_id: string              // FK to users.uid
  plan: BoutiquePlan
  status: BoutiqueStatus
  trial_ends_at?: string
  subscription_ends_at?: string
  
  // Details
  description?: string
  logo_url?: string
  location?: string
  phone_number?: string
  email?: string
  
  // Status
  is_active: boolean
  team_members_count: number
  
  // Features
  features: {
    units: boolean
    wholesale: boolean
    credit: boolean
    customers: boolean
    stockIncrement: boolean
    historicalMoves: boolean
    importChina: boolean
    supplierInvoiceScan?: boolean
    crm?: boolean
    autoRelance?: boolean
    comptabilite?: boolean
    exportComptable?: boolean
    ecommerce?: boolean
  }
  
  created_at: string
  updated_at?: string
}

/**
 * Product
 */
export interface Product {
  id: string                    // UUID
  boutique_id: string           // FK
  
  // Identifiers
  name: string
  sku: string
  barcode?: string
  
  // Pricing (in centimes: 1 = 0.01 currency unit)
  price_retail: number
  price_wholesale?: number
  cost_price?: number
  
  // Stock
  quantity_in_stock: number
  min_stock_level?: number
  unit_of_measure: string       // 'pcs', 'kg', 'l', 'm', etc
  
  // Information
  category?: string
  description?: string
  image_url?: string
  supplier_name?: string
  
  // Status
  is_active: boolean
  
  // Timestamps
  created_at: string
  updated_at?: string
  last_restocked_at?: string
}

/**
 * Customer
 */
export interface Customer {
  id: string                    // UUID
  boutique_id: string           // FK
  
  // Info
  full_name: string
  phone_number?: string
  email?: string
  
  // Address
  street_address?: string
  city?: string
  postal_code?: string
  
  // Details
  customer_type: CustomerType
  credit_limit: number          // in centimes
  
  // Status
  is_active: boolean
  notes?: string
  
  // Timestamps
  created_at: string
  updated_at?: string
  last_purchase_at?: string
}

/**
 * Sale
 */
export interface Sale {
  id: string                    // UUID
  boutique_id: string           // FK
  
  // Identifiers
  invoice_number?: string       // UNIQUE
  
  // Type & customer
  sale_type: SaleType
  customer_id?: string          // FK, nullable
  customer_name?: string
  
  // Amounts (in centimes)
  subtotal: number
  tax_amount: number
  total_amount: number
  
  // Payment
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  amount_paid?: number          // If partial
  
  // Context
  seller_name?: string
  notes?: string
  
  // Discount
  discount_amount: number
  discount_reason?: string
  
  // Voiding
  is_void: boolean
  void_reason?: string
  
  // Timestamps
  created_at: string
  sale_date: string             // When sale occurred
}

/**
 * Sale Item (Item in a sale)
 */
export interface SaleItem {
  id: string                    // UUID
  sale_id: string               // FK
  product_id: string            // FK
  
  // Details
  product_name: string
  quantity: number
  
  // Pricing
  unit_price: number            // Price at time of sale
  is_wholesale_price: boolean
  item_total: number            // unit_price × quantity
  
  // Discount
  discount_amount: number
  discount_percent?: number
  
  created_at: string
}

/**
 * Customer Debt
 */
export interface Debt {
  id: string                    // UUID
  boutique_id: string           // FK
  customer_id: string           // FK
  sale_id?: string              // FK
  
  // Amount (in centimes)
  original_amount: number
  remaining_amount: number
  
  // Status
  status: DebtStatus
  
  // Dates
  due_date?: string
  created_at: string
  updated_at?: string
  paid_at?: string
  
  // Context
  reason?: string
  notes?: string
}

/**
 * Payment (Payment toward debt or sale)
 */
export interface Payment {
  id: string                    // UUID
  boutique_id: string           // FK
  debt_id?: string              // FK, nullable
  customer_id: string           // FK
  
  // Payment
  amount: number                // in centimes
  payment_method: PaymentMethod
  
  // Reference
  transaction_reference?: string
  
  // Status
  status: 'pending' | 'completed' | 'failed'
  
  // Context
  notes?: string
  recorded_by?: string
  
  // Timestamps
  payment_date: string
  created_at: string
}

/**
 * Stock Move (Inventory movement record)
 */
export interface StockMove {
  id: string                    // UUID
  boutique_id: string           // FK
  product_id: string            // FK
  
  // Movement
  move_type: StockMoveType
  quantity_change: number       // positive or negative
  
  // Reference
  reference_type?: string       // 'sale', 'import', etc
  reference_id?: string
  
  // Context
  reason?: string
  recorded_by?: string
  notes?: string
  
  // Timestamps
  move_date: string
  created_at: string
}

/**
 * China Import Order
 */
export interface ChinaImport {
  id: string                    // UUID
  boutique_id: string           // FK
  
  // Order
  order_number: string          // UNIQUE
  supplier_name: string
  supplier_contact?: string
  
  // Status
  status: ImportStatus
  
  // Items (flexible structure)
  items: Array<{
    product_name: string
    sku?: string
    quantity: number
    unit_price: number          // Cost per unit
  }>
  
  // Costs (in centimes)
  total_cost: number
  shipping_cost: number
  customs_fees: number
  total_amount: number
  
  // Dates
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  
  // Payment
  payment_status: 'pending' | 'partial' | 'paid'
  amount_paid: number
  
  // Tracking
  tracking_number?: string
  notes?: string
  
  // Timestamps
  created_at: string
  updated_at?: string
}

/**
 * User Invitation to Boutique
 */
export interface Invitation {
  id: string                    // UUID
  boutique_id: string           // FK
  
  // Invite
  invited_email: string
  invited_role: UserRole
  
  // Status
  status: InvitationStatus
  accepted_by_user_id?: string  // FK auth.users, if accepted
  
  // Timing
  expires_at: string
  accepted_at?: string
  
  // Who invited
  created_by: string            // FK auth.users
  created_at: string
  
  notes?: string
}

/**
 * Audit Log (System audit trail)
 */
export interface AuditLog {
  id: string                    // UUID
  boutique_id: string           // FK
  
  // Actor
  actor_id?: string             // FK auth.users
  actor_email?: string
  
  // Action
  action: AuditAction
  entity_type: string           // table name
  entity_id?: string
  
  // Changes
  changes?: Record<string, any>
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  
  // Context
  ip_address?: string
  user_agent?: string
  notes?: string
  
  // Status
  status: AuditStatus
  created_at: string
}

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSIONS & ROLES
// ═══════════════════════════════════════════════════════════════════════════

export type Role = 'superadmin' | 'owner' | 'manager' | 'staff';

export type PermissionId =
  | 'canManageUsers'
  | 'canDeleteSales'
  | 'canManageFeatures'
  | 'canViewReports'
  | 'canUseAdvancedIA'
  | 'canExportData'
  | 'canManageProducts'
  | 'canManageInventory';

export interface Permissions {
  canManageUsers: boolean;
  canDeleteSales: boolean;
  canManageFeatures: boolean;
  canViewReports: boolean;
  canUseAdvancedIA: boolean;
  canExportData: boolean;
  canManageProducts: boolean;
  canManageInventory: boolean;
}

export const DEFAULT_OWNER_PERMISSIONS: Permissions = {
  canManageUsers: true,
  canDeleteSales: true,
  canManageFeatures: true,
  canViewReports: true,
  canUseAdvancedIA: true,
  canExportData: true,
  canManageProducts: true,
  canManageInventory: true,
};

export const DEFAULT_MANAGER_PERMISSIONS: Permissions = {
  canManageUsers: false,
  canDeleteSales: false,
  canManageFeatures: false,
  canViewReports: true,
  canUseAdvancedIA: false,
  canExportData: true,
  canManageProducts: true,
  canManageInventory: true,
};

export const DEFAULT_STAFF_PERMISSIONS: Permissions = {
  canManageUsers: false,
  canDeleteSales: false,
  canManageFeatures: false,
  canViewReports: false,
  canUseAdvancedIA: false,
  canExportData: false,
  canManageProducts: false,
  canManageInventory: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create Product Request
 */
export interface CreateProductRequest {
  name: string
  sku: string
  barcode?: string
  price_retail: number
  price_wholesale?: number
  cost_price?: number
  quantity_in_stock?: number
  min_stock_level?: number
  unit_of_measure?: string
  category?: string
  description?: string
  image_url?: string
  supplier_name?: string
}

/**
 * Create Sale Request
 */
export interface CreateSaleRequest {
  sale_type: SaleType
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  seller_name?: string
  invoice_number?: string
  items: Array<{
    product_id: string
    quantity: number
    is_wholesale_price?: boolean
  }>
  payment_method: PaymentMethod
  discount_amount?: number
  discount_reason?: string
  notes?: string
}

/**
 * Create Customer Request
 */
export interface CreateCustomerRequest {
  full_name: string
  phone_number?: string
  email?: string
  street_address?: string
  city?: string
  postal_code?: string
  customer_type?: CustomerType
  credit_limit?: number
  notes?: string
}

/**
 * Bulk Import Response
 */
export interface BulkImportResponse {
  success: boolean
  total_records: number
  imported_count: number
  failed_count: number
  errors?: Array<{
    row_number: number
    error: string
  }>
}

/**
 * Daily Sales Summary (from materialized view)
 */
export interface DailySalesSummary {
  boutique_id: string
  sale_date: string            // Date in YYYY-MM-DD
  total_transactions: number
  total_revenue: number        // in centimes
  total_discounts: number      // in centimes
  unique_customers: number
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  total: number
  page: number
  per_page: number
  has_next: boolean
  has_previous: boolean
}

/**
 * API Error Response
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

/**
 * Database Stats
 */
export interface BoutiqueStats {
  products_count: number
  active_products: number
  low_stock_count: number
  customers_count: number
  total_revenue: number        // all-time, in centimes
  sales_count: number
  pending_debts_count: number
  pending_debts_amount: number  // in centimes
}
