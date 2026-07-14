-- ============================================================
-- Migration 008 : Table waitlist (liste d'attente bêta)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  business_type TEXT,
  status TEXT DEFAULT 'pending',  -- pending, contacted, approved, created, rejected
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at DESC);

-- RLS : lecture/écriture pour tous (le formulaire est public)
-- Seul le superadmin peut modifier le statut
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- INSERT : public (le formulaire de liste d'attente)
DROP POLICY IF EXISTS "waitlist_insert_public" ON public.waitlist;
CREATE POLICY "waitlist_insert_public" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- SELECT : seulement superadmin
DROP POLICY IF EXISTS "waitlist_select_admin" ON public.waitlist;
CREATE POLICY "waitlist_select_admin" ON public.waitlist
  FOR SELECT USING (public.is_superadmin());

-- UPDATE : seulement superadmin
DROP POLICY IF EXISTS "waitlist_update_admin" ON public.waitlist;
CREATE POLICY "waitlist_update_admin" ON public.waitlist
  FOR UPDATE USING (public.is_superadmin());

-- DELETE : seulement superadmin
DROP POLICY IF EXISTS "waitlist_delete_admin" ON public.waitlist;
CREATE POLICY "waitlist_delete_admin" ON public.waitlist
  FOR DELETE USING (public.is_superadmin());

SELECT 'waitlist table created' as status;
