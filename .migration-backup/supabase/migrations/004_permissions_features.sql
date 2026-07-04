-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 004: Permissions, Feature Flags, Subscription Mgmt
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. ADD PERMISSIONS COLUMN TO USERS
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{
  "canManageUsers": false,
  "canDeleteSales": false,
  "canManageFeatures": false,
  "canViewReports": false,
  "canUseAdvancedIA": false,
  "canExportData": false,
  "canManageProducts": false,
  "canManageInventory": false
}'::jsonb;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. ADD SUBSCRIPTION MANAGEMENT COLUMNS TO BOUTIQUES
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.boutiques
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_suspend boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. UPDATE DEFAULT FEATURES TO INCLUDE ALL NEW FLAGS
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.default_boutique_features()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'wholesale', false,
    'credit', false,
    'customers', false,
    'units', false,
    'chinaImport', false,
    'advancedReports', false,
    'multiCart', false,
    'stockIncrement', true,
    'historicalMoves', false
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. FUNCTION: AUTO-SUSPEND EXPIRED TRIALS
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_suspend_expired_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.boutiques
  SET status = 'Suspendu',
      suspended_at = NOW(),
      updated_at = NOW()
  WHERE status = 'Essai'
    AND trial_ends_at < NOW()
    AND auto_suspend = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. FUNCTION: SET DEFAULT PERMISSIONS FOR NEW USERS
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' OR NEW.role = 'owner' THEN
    NEW.permissions = jsonb_build_object(
      'canManageUsers', true,
      'canDeleteSales', true,
      'canManageFeatures', true,
      'canViewReports', true,
      'canUseAdvancedIA', true,
      'canExportData', true,
      'canManageProducts', true,
      'canManageInventory', true
    );
  ELSIF NEW.role = 'manager' THEN
    NEW.permissions = jsonb_build_object(
      'canManageUsers', false,
      'canDeleteSales', false,
      'canManageFeatures', false,
      'canViewReports', true,
      'canUseAdvancedIA', false,
      'canExportData', true,
      'canManageProducts', true,
      'canManageInventory', true
    );
  ELSE
    NEW.permissions = jsonb_build_object(
      'canManageUsers', false,
      'canDeleteSales', false,
      'canManageFeatures', false,
      'canViewReports', false,
      'canUseAdvancedIA', false,
      'canExportData', false,
      'canManageProducts', false,
      'canManageInventory', false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_permissions ON public.users;
CREATE TRIGGER trigger_set_default_permissions
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_default_permissions();

-- ═══════════════════════════════════════════════════════════════════════════
-- END MIGRATION 004
-- ═══════════════════════════════════════════════════════════════════════════
