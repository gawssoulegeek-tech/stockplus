-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 005 : Helpers SQL, RLS avancées, et fonctionnalités
-- ═══════════════════════════════════════════════════════════════════════════
-- Exécuter dans Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ==========================================
-- 1. HELPERS SQL
-- ==========================================

-- Vérifie si l'utilisateur courant est superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid() AND role = 'superadmin'
  );
$$;

-- Vérifie si l'utilisateur courant est le propriétaire d'une boutique donnée
CREATE OR REPLACE FUNCTION public.is_owner(boutique_id_param text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boutiques
    WHERE id = boutique_id_param AND owner_id = auth.uid()
  );
$$;

-- Récupère la boutique_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_current_boutique_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT boutique_id FROM public.users WHERE uid = auth.uid() LIMIT 1;
$$;

-- Vérifie si l'utilisateur courant a une permission spécifique
CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT (permissions->>permission_name)::boolean FROM public.users WHERE uid = auth.uid()),
    false
  );
$$;

-- ==========================================
-- 2. RLS POLICIES AVANCÉES
-- ==========================================

-- Supression des anciennes policies pour les recréer
DROP POLICY IF EXISTS "boutiques_select_owner" ON public.boutiques;
DROP POLICY IF EXISTS "boutiques_select_member" ON public.boutiques;
DROP POLICY IF EXISTS "boutiques_update_owner" ON public.boutiques;
DROP POLICY IF EXISTS "boutiques_insert_owner" ON public.boutiques;

-- Boutiques : superadmin voit tout, owner voit sa boutique
CREATE POLICY "boutiques_select" ON public.boutiques
  FOR SELECT USING (
    public.is_superadmin()
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = boutiques.id)
  );

CREATE POLICY "boutiques_insert" ON public.boutiques
  FOR INSERT WITH CHECK (
    public.is_superadmin() OR owner_id = auth.uid()
  );

CREATE POLICY "boutiques_update" ON public.boutiques
  FOR UPDATE USING (
    public.is_superadmin() OR owner_id = auth.uid()
  );

CREATE POLICY "boutiques_delete" ON public.boutiques
  FOR DELETE USING (
    public.is_superadmin()
  );

-- Products : accès par boutique
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (
    boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (
    boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (
    boutique_id = public.get_current_boutique_id()
  );

-- Sales : accès par boutique
DROP POLICY IF EXISTS "sales_select" ON public.sales;
CREATE POLICY "sales_select" ON public.sales
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "sales_insert" ON public.sales;
CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT WITH CHECK (
    boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "sales_update" ON public.sales;
CREATE POLICY "sales_update" ON public.sales
  FOR UPDATE USING (
    boutique_id = public.get_current_boutique_id()
  );

-- Stock moves
DROP POLICY IF EXISTS "stock_moves_select" ON public.stock_moves;
CREATE POLICY "stock_moves_select" ON public.stock_moves
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "stock_moves_insert" ON public.stock_moves;
CREATE POLICY "stock_moves_insert" ON public.stock_moves
  FOR INSERT WITH CHECK (
    boutique_id = public.get_current_boutique_id()
  );

-- Customers
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (
    boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (
    boutique_id = public.get_current_boutique_id()
  );

-- Debts
DROP POLICY IF EXISTS "debts_select" ON public.debts;
CREATE POLICY "debts_select" ON public.debts
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "debts_insert" ON public.debts;
CREATE POLICY "debts_insert" ON public.debts
  FOR INSERT WITH CHECK (
    boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "debts_update" ON public.debts;
CREATE POLICY "debts_update" ON public.debts
  FOR UPDATE USING (
    boutique_id = public.get_current_boutique_id()
  );

-- Audit logs : superadmin voit tout, owner voit sa boutique
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

-- ==========================================
-- 3. MISE À JOUR DES CONTRAINTES (owner)
-- ==========================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'owner', 'manager', 'staff'));

-- ==========================================
-- 4. FONCTION DE CRÉATION DE BOUTIQUE (signup)
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_boutique_with_owner(
  user_id uuid,
  user_email text,
  user_name text,
  boutique_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_boutique_id text;
  trial_end timestamp with time zone;
  result jsonb;
BEGIN
  -- Générer l'ID de boutique
  new_boutique_id := 'boutique_' || extract(epoch from now())::bigint;

  -- Date de fin d'essai (14 jours)
  trial_end := now() + interval '14 days';

  -- Créer le profil utilisateur
  INSERT INTO public.users (uid, email, name, role, boutique_id, permissions, created_at)
  VALUES (
    user_id,
    user_email,
    user_name,
    'owner',
    new_boutique_id,
    '{"canManageUsers":true,"canDeleteSales":true,"canManageFeatures":true,"canViewReports":true,"canUseAdvancedIA":true,"canExportData":true,"canManageProducts":true,"canManageInventory":true}'::jsonb,
    now()
  );

  -- Créer la boutique
  INSERT INTO public.boutiques (
    id, name, owner_id, plan, status, trial_ends_at, features,
    team_members_count, auto_suspend, is_active, created_at
  ) VALUES (
    new_boutique_id,
    boutique_name,
    user_id,
    'Essai',
    'Essai',
    trial_end,
    '{"wholesale":false,"credit":false,"customers":false,"units":false,"chinaImport":false,"advancedReports":false,"multiCart":false,"stockIncrement":true}'::jsonb,
    1, true, true, now()
  );

  -- Log
  INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, notes, status, created_at)
  VALUES (new_boutique_id, user_id, 'create', 'boutiques', new_boutique_id, 'Boutique créée via inscription', 'success', now());

  -- Retourner le résultat
  result := jsonb_build_object(
    'success', true,
    'boutique_id', new_boutique_id,
    'trial_ends_at', trial_end
  );

  RETURN result;
END;
$$;

-- ==========================================
-- 5. AUTO-SUSPENSION DES ESSAYS EXPIRÉS
-- ==========================================

CREATE OR REPLACE FUNCTION public.auto_suspend_expired_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  suspended_count integer;
BEGIN
  UPDATE public.boutiques
  SET status = 'Suspendu', updated_at = now()
  WHERE status = 'Essai'
    AND trial_ends_at < now()
    AND auto_suspend = true;

  GET DIAGNOSTICS suspended_count = ROW_COUNT;
  RETURN suspended_count;
END;
$$;

-- Note: Pour exécuter automatiquement cette fonction, créez un cron dans Supabase:
-- SELECT cron.schedule('auto-suspend', '0 0 * * *', 'SELECT auto_suspend_expired_trials();');
-- (nécessite l'extension pg_cron activée dans Supabase Dashboard → Database → Extensions)
