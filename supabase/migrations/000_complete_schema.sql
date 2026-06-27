-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration complète (à exécuter dans Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCTIONS :
-- 1. Allez sur https://supabase.com/dashboard/project/dpjhzxcjubkjngqogbft
-- 2. Cliquez "SQL Editor" dans le menu de gauche
-- 3. Cliquez "+ New Query"
-- 4. Copiez-collez TOUT ce fichier
-- 5. Cliquez "Run" (ou Ctrl+Enter)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 2. SUPPRESSION DES TABLES EXISTANTES
--    (pour recréation propre)
-- ==========================================
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.stock_moves CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.china_imports CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.boutiques CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==========================================
-- 3. USERS
-- ==========================================
CREATE TABLE public.users (
  uid uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('superadmin', 'owner', 'manager', 'staff')),
  boutique_id text,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. BOUTIQUES
-- ==========================================
CREATE TABLE public.boutiques (
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
  features jsonb DEFAULT '{"wholesale":false,"credit":false,"customers":false,"units":false,"chinaImport":false,"advancedReports":false,"multiCart":false,"stockIncrement":true}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;

-- FK users -> boutiques
ALTER TABLE public.users ADD CONSTRAINT fk_users_boutique FOREIGN KEY (boutique_id) REFERENCES public.boutiques(id) ON DELETE SET NULL;

-- ==========================================
-- 5. PROFILES
-- ==========================================
CREATE TABLE public.profiles (
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. PRODUITS
-- ==========================================
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL DEFAULT '',
  barcode text,
  price_retail integer NOT NULL DEFAULT 0,
  price_wholesale integer DEFAULT 0,
  cost_price integer DEFAULT 0,
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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. CLIENTS
-- ==========================================
CREATE TABLE public.customers (
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

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 8. VENTES
-- ==========================================
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  invoice_number text UNIQUE,
  sale_type text NOT NULL DEFAULT 'retail' CHECK (sale_type IN ('retail', 'wholesale')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  subtotal integer NOT NULL DEFAULT 0,
  tax_amount integer DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'credit', 'mobile', 'wave', 'orange_money')),
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

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 9. ARTICLES VENDUS
-- ==========================================
CREATE TABLE public.sale_items (
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

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 10. MOUVEMENTS DE STOCK
-- ==========================================
CREATE TABLE public.stock_moves (
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

ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 11. DETTES / CRÉANCES
-- ==========================================
CREATE TABLE public.debts (
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

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 12. PAIEMENTS
-- ==========================================
CREATE TABLE public.payments (
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
  notes text,
  recorded_by text
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 13. IMPORT CHINE
-- ==========================================
CREATE TABLE public.china_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  supplier_name text NOT NULL,
  supplier_contact text,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'shipped', 'in_transit', 'received', 'cancelled')),
  items jsonb NOT NULL DEFAULT '[]',
  total_cost integer NOT NULL DEFAULT 0,
  shipping_cost integer DEFAULT 0,
  customs_fees integer DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
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

ALTER TABLE public.china_imports ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 14. INVITATIONS
-- ==========================================
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id text NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_role text NOT NULL CHECK (invited_role IN ('owner', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 15. LOGS D'AUDIT
-- ==========================================
CREATE TABLE public.audit_logs (
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

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 16. INDEX
-- ==========================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_boutique_id ON public.users(boutique_id);
CREATE INDEX IF NOT EXISTS idx_boutiques_owner_id ON public.boutiques(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_boutique ON public.products(boutique_id);
CREATE INDEX IF NOT EXISTS idx_sales_boutique ON public.sales(boutique_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(boutique_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_moves_boutique ON public.stock_moves(boutique_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON public.stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_boutique ON public.customers(boutique_id);
CREATE INDEX IF NOT EXISTS idx_debts_boutique ON public.debts(boutique_id);
CREATE INDEX IF NOT EXISTS idx_payments_boutique ON public.payments(boutique_id);
CREATE INDEX IF NOT EXISTS idx_china_imports_boutique ON public.china_imports(boutique_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_boutique ON public.audit_logs(boutique_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON public.audit_logs(boutique_id, created_at DESC);

-- ==========================================
-- 17. RLS POLICIES
-- ==========================================

-- Fonctions helpers
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_owner(boutique_id_param text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.boutiques WHERE id = boutique_id_param AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_current_boutique_id() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT boutique_id FROM public.users WHERE uid = auth.uid() LIMIT 1;
$$;

-- Users
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  auth.uid() = uid OR public.is_superadmin()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = users.boutique_id)
);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (auth.uid() = uid OR public.is_superadmin());

-- Boutiques
CREATE POLICY "boutiques_select" ON public.boutiques FOR SELECT USING (
  public.is_superadmin() OR owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = boutiques.id)
);
CREATE POLICY "boutiques_insert" ON public.boutiques FOR INSERT WITH CHECK (public.is_superadmin() OR owner_id = auth.uid());
CREATE POLICY "boutiques_update" ON public.boutiques FOR UPDATE USING (public.is_superadmin() OR owner_id = auth.uid());
CREATE POLICY "boutiques_delete" ON public.boutiques FOR DELETE USING (public.is_superadmin());

-- Toutes les autres tables (accès par boutique)
CREATE POLICY "products_select" ON public.products FOR SELECT USING (public.is_superadmin() OR boutique_id = public.get_current_boutique_id());
CREATE POLICY "products_insert" ON public.products FOR INSERT WITH CHECK (boutique_id = public.get_current_boutique_id());
CREATE POLICY "products_update" ON public.products FOR UPDATE USING (boutique_id = public.get_current_boutique_id());
CREATE POLICY "products_delete" ON public.products FOR DELETE USING (boutique_id = public.get_current_boutique_id());

-- ==========================================
-- 18. TRIGGERS
-- ==========================================

-- Mise à jour du stock à la vente
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products SET quantity_in_stock = quantity_in_stock - NEW.quantity, updated_at = now() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_update_stock_on_sale_item AFTER INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_on_sale();

-- Restauration du stock si vente annulée
CREATE OR REPLACE FUNCTION public.restore_stock_on_void_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.is_void = true AND OLD.is_void = false THEN
    UPDATE public.products p SET quantity_in_stock = p.quantity_in_stock + si.quantity, updated_at = now()
    FROM public.sale_items si WHERE si.sale_id = NEW.id AND p.id = si.product_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_restore_stock_on_void AFTER UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_void_sale();

-- Audit automatique
CREATE OR REPLACE FUNCTION public.log_audit_trail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_boutique_id text;
BEGIN
  v_boutique_id := COALESCE(NEW.boutique_id, OLD.boutique_id, (SELECT boutique_id FROM public.users WHERE uid = auth.uid() LIMIT 1));
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, new_values, status, created_at)
    VALUES (v_boutique_id, auth.uid(), 'create', TG_TABLE_NAME, CAST(NEW.id AS text), row_to_json(NEW)::jsonb, 'success', now());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, old_values, new_values, status, created_at)
    VALUES (v_boutique_id, auth.uid(), 'update', TG_TABLE_NAME, CAST(NEW.id AS text), row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, 'success', now());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, old_values, status, created_at)
    VALUES (v_boutique_id, auth.uid(), 'delete', TG_TABLE_NAME, CAST(OLD.id AS text), row_to_json(OLD)::jsonb, 'success', now());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trigger_audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
CREATE TRIGGER trigger_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();
CREATE TRIGGER trigger_audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- ==========================================
-- 19. FONCTION D'INSCRIPTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.create_boutique_with_owner(
  user_id uuid, user_email text, user_name text, boutique_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_boutique_id text;
  trial_end timestamp with time zone;
  result jsonb;
BEGIN
  new_boutique_id := 'boutique_' || extract(epoch from now())::bigint;
  trial_end := now() + interval '14 days';

  INSERT INTO public.users (uid, email, name, role, boutique_id, permissions, created_at)
  VALUES (user_id, user_email, user_name, 'owner', new_boutique_id,
    '{"canManageUsers":true,"canDeleteSales":true,"canManageFeatures":true,"canViewReports":true,"canUseAdvancedIA":true,"canExportData":true,"canManageProducts":true,"canManageInventory":true}'::jsonb, now());

  INSERT INTO public.boutiques (id, name, owner_id, plan, status, trial_ends_at, features, team_members_count, is_active, created_at)
  VALUES (new_boutique_id, boutique_name, user_id, 'Essai', 'Essai', trial_end,
    '{"wholesale":false,"credit":false,"customers":false,"units":false,"chinaImport":false,"advancedReports":false,"multiCart":false,"stockIncrement":true}'::jsonb, 1, true, now());

  INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, notes, status, created_at)
  VALUES (new_boutique_id, user_id, 'create', 'boutiques', new_boutique_id, 'Boutique créée via inscription', 'success', now());

  result := jsonb_build_object('success', true, 'boutique_id', new_boutique_id, 'trial_ends_at', trial_end);
  RETURN result;
END;
$$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ Migration terminée !
-- ═══════════════════════════════════════════════════════════════════════════
-- Prochaines étapes :
-- 1. Activez Auth : Authentication → Providers → Email → Enable
-- 2. Créez un superadmin : UPDATE public.users SET role = 'superadmin' WHERE email = 'votre@email.com';
-- 3. Redémarrez l'application : npm run dev
-- ═══════════════════════════════════════════════════════════════════════════
