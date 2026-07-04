-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 002: Business Tables
-- ═══════════════════════════════════════════════════════════════════════════
-- Creates: products, customers, sales, sale_items, debts, stock_moves,
--          china_imports, payments, invitations, audit_logs
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. PRODUCTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL,
  barcode text,
  price_retail integer NOT NULL,
  price_wholesale integer,
  cost_price integer,
  quantity_in_stock integer NOT NULL DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  unit_of_measure text DEFAULT 'pcs',
  category text,
  description text,
  image_url text,
  supplier_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  last_restocked_at timestamp with time zone
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. CUSTOMERS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone_number text,
  email text,
  street_address text,
  city text,
  postal_code text,
  customer_type text DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
  credit_limit integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  last_purchase_at timestamp with time zone
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. SALES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  invoice_number text UNIQUE,
  sale_type text NOT NULL CHECK (sale_type IN ('retail', 'wholesale')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  subtotal integer NOT NULL DEFAULT 0,
  tax_amount integer DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'credit', 'mobile')),
  payment_status text NOT NULL DEFAULT 'complete' CHECK (payment_status IN ('complete', 'partial', 'pending')),
  amount_paid integer,
  seller_name text,
  notes text,
  discount_amount integer DEFAULT 0,
  discount_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  sale_date timestamp with time zone DEFAULT NOW(),
  is_void boolean DEFAULT false,
  void_reason text
);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. SALE_ITEMS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  is_wholesale_price boolean DEFAULT false,
  item_total integer NOT NULL,
  discount_amount integer DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. STOCK_MOVES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  move_type text NOT NULL CHECK (move_type IN ('purchase', 'sale', 'adjustment', 'return', 'damage')),
  quantity_change integer NOT NULL,
  reference_type text CHECK (reference_type IN ('sale', 'import', 'adjustment', 'return')),
  reference_id text,
  reason text,
  recorded_by text,
  notes text,
  move_date timestamp with time zone NOT NULL DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. DEBTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  original_amount integer NOT NULL,
  remaining_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partial', 'paid', 'cancelled')),
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  paid_at timestamp with time zone,
  reason text,
  notes text
);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. PAYMENTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  debt_id uuid REFERENCES public.debts(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount integer NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile', 'transfer')),
  transaction_reference text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date timestamp with time zone NOT NULL DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  notes text,
  recorded_by text
);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. CHINA_IMPORTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.china_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  supplier_name text NOT NULL,
  supplier_contact text,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'shipped', 'in_transit', 'received', 'cancelled')),
  items jsonb NOT NULL DEFAULT '[]',
  total_cost integer NOT NULL,
  shipping_cost integer DEFAULT 0,
  customs_fees integer DEFAULT 0,
  total_amount integer NOT NULL,
  order_date timestamp with time zone NOT NULL DEFAULT NOW(),
  expected_delivery_date timestamp with time zone,
  actual_delivery_date timestamp with time zone,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  amount_paid integer DEFAULT 0,
  tracking_number text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. INVITATIONS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_role text NOT NULL CHECK (invited_role IN ('admin', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text
);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. AUDIT_LOGS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  changes jsonb,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  status text DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning'))
);

-- ═══════════════════════════════════════════════════════════════════════════
-- END MIGRATION 002
-- ═══════════════════════════════════════════════════════════════════════════
