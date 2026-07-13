-- ============================================================
-- Migration 005 : Création de la table quotations (devis)
-- + Correction des colonnes audit_logs
-- ============================================================

-- 1. Créer la table quotations si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id TEXT NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  quote_number TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_boutique_id ON public.quotations(boutique_id);

-- RLS sur quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotations_select_own" ON public.quotations;
CREATE POLICY "quotations_select_own" ON public.quotations
  FOR SELECT USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "quotations_insert_own" ON public.quotations;
CREATE POLICY "quotations_insert_own" ON public.quotations
  FOR INSERT WITH CHECK (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "quotations_update_own" ON public.quotations;
CREATE POLICY "quotations_update_own" ON public.quotations
  FOR UPDATE USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

DROP POLICY IF EXISTS "quotations_delete_own" ON public.quotations;
CREATE POLICY "quotations_delete_own" ON public.quotations
  FOR DELETE USING (
    public.is_superadmin()
    OR boutique_id = public.get_current_boutique_id()
  );

-- 2. Vérifier que toutes les tables existent
SELECT 'quotations' as table_name, count(*) as columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name='quotations';

-- 3. Vérification finale
SELECT 'Migration 005 completed' as status;
