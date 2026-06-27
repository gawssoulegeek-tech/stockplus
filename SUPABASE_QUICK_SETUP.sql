-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Quick Setup SQL (Tout-en-un)
-- ═══════════════════════════════════════════════════════════════════════════
-- Copiez-collez ce fichier dans Supabase SQL Editor et exécutez-le.
-- Il crée toute la base de données, les index, les RLS, et les triggers.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. TABLES PRINCIPALES
-- ==========================================

-- USERS (lié à auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  uid uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'staff', 'superadmin')),
  boutique_id text,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- BOUTIQUES
CREATE TABLE IF NOT EXISTS public.boutiques (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'Essai' CHECK (plan IN ('Essai', 'Basic', 'Pro', 'Premium')),
  status text NOT NULL DEFAULT 'Essai' CHECK (status IN ('Essai', 'Actif', 'Suspendu')),
  description text,
  logo_url text,
  location text,
  phone_number text,
  email text,
  is_active boolean DEFAULT true,
  team_members_count integer DEFAULT 1,
  trial_ends_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  auto_suspend boolean DEFAULT true,
  features jsonb DEFAULT '{"wholesale":false,"credit":false,"customers":false,"units":false,"chinaImport":false,"advancedReports":false,"multiCart":false,"stockIncrement":true,"historicalMoves":false}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- FK users -> boutiques (après création de boutiques)
ALTER TABLE public.users ADD CONSTRAINT fk_users_boutique FOREIGN KEY (boutique_id) REFERENCES public.boutiques(id) ON DELETE SET NULL;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone_number text,
  language text DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  timezone text DEFAULT 'Africa/Dakar',
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  last_login_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- ==========================================
-- 3. TABLES MÉTIER
-- ==========================================

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  name text NOT NULL, sku text NOT NULL, barcode text,
  price_retail integer NOT NULL, price_wholesale integer, cost_price integer,
  quantity_in_stock integer NOT NULL DEFAULT 0, min_stock_level integer DEFAULT 10,
  unit_of_measure text DEFAULT 'pcs', category text, description text,
  image_url text, supplier_name text, is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  last_restocked_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  full_name text NOT NULL, phone_number text, email text,
  street_address text, city text, postal_code text,
  customer_type text DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
  credit_limit integer DEFAULT 0, is_active boolean DEFAULT true, notes text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  last_purchase_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  invoice_number text UNIQUE,
  sale_type text NOT NULL CHECK (sale_type IN ('retail', 'wholesale')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  subtotal integer NOT NULL DEFAULT 0, tax_amount integer DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'credit', 'mobile', 'wave', 'orange_money')),
  payment_status text NOT NULL DEFAULT 'complete' CHECK (payment_status IN ('complete', 'partial', 'pending')),
  amount_paid integer, seller_name text, notes text,
  discount_amount integer DEFAULT 0, discount_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  sale_date timestamp with time zone DEFAULT NOW(),
  is_void boolean DEFAULT false, void_reason text
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL, quantity integer NOT NULL,
  unit_price integer NOT NULL, is_wholesale_price boolean DEFAULT false,
  item_total integer NOT NULL, discount_amount integer DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  move_type text NOT NULL CHECK (move_type IN ('purchase', 'sale', 'adjustment', 'return', 'damage')),
  quantity_change integer NOT NULL,
  reference_type text CHECK (reference_type IN ('sale', 'import', 'adjustment', 'return')),
  reference_id text, reason text, recorded_by text, notes text,
  move_date timestamp with time zone NOT NULL DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  original_amount integer NOT NULL, remaining_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partial', 'paid', 'cancelled')),
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  paid_at timestamp with time zone, reason text, notes text
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  debt_id uuid REFERENCES public.debts(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount integer NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile', 'transfer', 'wave', 'orange_money')),
  transaction_reference text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date timestamp with time zone NOT NULL DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  notes text, recorded_by text
);

CREATE TABLE IF NOT EXISTS public.china_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL, supplier_name text NOT NULL, supplier_contact text,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'shipped', 'in_transit', 'received', 'cancelled')),
  items jsonb NOT NULL DEFAULT '[]',
  total_cost integer NOT NULL, shipping_cost integer DEFAULT 0,
  customs_fees integer DEFAULT 0, total_amount integer NOT NULL,
  order_date timestamp with time zone NOT NULL DEFAULT NOW(),
  expected_delivery_date timestamp with time zone,
  actual_delivery_date timestamp with time zone,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  amount_paid integer DEFAULT 0, tracking_number text, notes text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text, action text NOT NULL, entity_type text NOT NULL, entity_id text,
  changes jsonb, old_values jsonb, new_values jsonb,
  ip_address text, user_agent text, notes text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  status text DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning'))
);

-- ==========================================
-- 4. INDEX
-- ==========================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_boutique_id ON public.users(boutique_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_boutiques_owner_id ON public.boutiques(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_boutique ON public.products(boutique_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(boutique_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(boutique_id, barcode);
CREATE INDEX IF NOT EXISTS idx_sales_boutique ON public.sales(boutique_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(boutique_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_stock_moves_boutique ON public.stock_moves(boutique_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON public.stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_date ON public.stock_moves(boutique_id, move_date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_boutique ON public.customers(boutique_id);
CREATE INDEX IF NOT EXISTS idx_debts_boutique ON public.debts(boutique_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON public.debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_boutique ON public.payments(boutique_id);
CREATE INDEX IF NOT EXISTS idx_china_imports_boutique ON public.china_imports(boutique_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_boutique ON public.audit_logs(boutique_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON public.audit_logs(boutique_id, created_at DESC);

-- ==========================================
-- 5. RLS (Row Level Security)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.china_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users: peuvent voir leur propre profil
CREATE POLICY IF NOT EXISTS "users_select_own" ON public.users FOR SELECT USING (auth.uid() = uid);
CREATE POLICY IF NOT EXISTS "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = uid);
CREATE POLICY IF NOT EXISTS "users_select_superadmin" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin'));
CREATE POLICY IF NOT EXISTS "users_select_boutique_members" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = users.boutique_id));

-- Boutiques
CREATE POLICY IF NOT EXISTS "boutiques_select_owner" ON public.boutiques FOR SELECT USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin'));
CREATE POLICY IF NOT EXISTS "boutiques_select_member" ON public.boutiques FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = boutiques.id));
CREATE POLICY IF NOT EXISTS "boutiques_update_owner" ON public.boutiques FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY IF NOT EXISTS "boutiques_insert_owner" ON public.boutiques FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ==========================================
-- 6. TRIGGERS
-- ==========================================

-- Trigger: permissions par défaut selon rôle
CREATE OR REPLACE FUNCTION public.set_default_permissions() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('admin', 'superadmin') THEN
    NEW.permissions = '{"canManageUsers":true,"canDeleteSales":true,"canManageFeatures":true,"canViewReports":true,"canUseAdvancedIA":true,"canExportData":true,"canManageProducts":true,"canManageInventory":true}'::jsonb;
  ELSIF NEW.role = 'manager' THEN
    NEW.permissions = '{"canManageUsers":false,"canDeleteSales":false,"canManageFeatures":false,"canViewReports":true,"canUseAdvancedIA":false,"canExportData":true,"canManageProducts":true,"canManageInventory":true}'::jsonb;
  ELSE
    NEW.permissions = '{"canManageUsers":false,"canDeleteSales":false,"canManageFeatures":false,"canViewReports":false,"canUseAdvancedIA":false,"canExportData":false,"canManageProducts":false,"canManageInventory":false}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_set_default_permissions ON public.users;
CREATE TRIGGER trigger_set_default_permissions BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_default_permissions();

-- Trigger: mise à jour stock à la vente
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products SET quantity_in_stock = quantity_in_stock - NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_update_stock_on_sale_item ON public.sale_items;
CREATE TRIGGER trigger_update_stock_on_sale_item AFTER INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_on_sale();

-- Trigger: restauration stock si vente annulée
CREATE OR REPLACE FUNCTION public.restore_stock_on_void_sale() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_void = true AND OLD.is_void = false THEN
    UPDATE public.products p SET quantity_in_stock = p.quantity_in_stock + si.quantity
    FROM public.sale_items si WHERE si.sale_id = NEW.id AND p.id = si.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_restore_stock_on_void ON public.sales;
CREATE TRIGGER trigger_restore_stock_on_void AFTER UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_void_sale();

-- Trigger: audit logs automatique
CREATE OR REPLACE FUNCTION public.log_audit_trail() RETURNS TRIGGER AS $$
DECLARE v_boutique_id text;
BEGIN
  v_boutique_id := COALESCE(NEW.boutique_id, OLD.boutique_id, (SELECT boutique_id FROM public.users WHERE uid = auth.uid() LIMIT 1));
  IF TG_OP = 'INSERT' THEN INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, new_values, status) VALUES (v_boutique_id, auth.uid(), 'create', TG_TABLE_NAME, CAST(NEW.id AS text), row_to_json(NEW)::jsonb, 'success');
  ELSIF TG_OP = 'UPDATE' THEN INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, old_values, new_values, status) VALUES (v_boutique_id, auth.uid(), 'update', TG_TABLE_NAME, CAST(NEW.id AS text), row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, 'success');
  ELSIF TG_OP = 'DELETE' THEN INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, old_values, status) VALUES (v_boutique_id, auth.uid(), 'delete', TG_TABLE_NAME, CAST(OLD.id AS text), row_to_json(OLD)::jsonb, 'success');
  END IF; RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_audit_sales ON public.sales; CREATE TRIGGER trigger_audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
DROP TRIGGER IF EXISTS trigger_audit_products ON public.products; CREATE TRIGGER trigger_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
DROP TRIGGER IF EXISTS trigger_audit_customers ON public.customers; CREATE TRIGGER trigger_audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- ==========================================
-- 7. MATERIALIZED VIEW
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_sales_summary AS
SELECT s.boutique_id, DATE(s.sale_date) as sale_date,
  COUNT(*) as total_transactions, SUM(s.total_amount) as total_revenue,
  SUM(s.discount_amount) as total_discounts, COUNT(DISTINCT s.customer_id) as unique_customers
FROM public.sales s WHERE s.is_void = false
GROUP BY s.boutique_id, DATE(s.sale_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_summary_unique ON public.daily_sales_summary(boutique_id, sale_date);

-- ==========================================
-- 8. CRÉER LE PREMIER SUPERADMIN (optionnel)
-- ==========================================
-- Décommentez et personnalisez après avoir créé le user dans Auth:
-- INSERT INTO public.users (uid, email, name, role) VALUES ('ID_DU_USER_AUTH', 'admin@stockplus.com', 'Super Admin', 'superadmin');

COMMIT;
