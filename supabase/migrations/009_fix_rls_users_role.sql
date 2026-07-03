-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 009: Fix RLS policy for users table
-- ═══════════════════════════════════════════════════════════════════════════
-- Problème : La politique `users_insert_own` permet à n'importe quel
-- utilisateur authentifié de s'insérer dans public.users avec
-- role='superadmin', car elle ne vérifie que auth.uid() = uid.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT
  WITH CHECK (
    auth.uid() = uid
    AND role IN ('owner', 'manager', 'staff')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- END MIGRATION 009
-- ═══════════════════════════════════════════════════════════════════════════
