-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 006: Fix RLS policies for signup flow
-- ═══════════════════════════════════════════════════════════════════════════
-- Problèmes corrigés :
-- 1. Ajout d'une politique INSERT manquante sur public.users
--    (empêche l'inscription via RLS même avec une session valide)
-- 2. Vérification que la contrainte CHECK role accepte 'owner'
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. POLITIQUE INSERT manquante sur public.users
-- ───────────────────────────────────────────────────────────────────────────
-- Sans cette politique, tout INSERT dans public.users est bloqué par RLS,
-- ce qui empêche la création du profil lors de l'inscription.
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT
  WITH CHECK (auth.uid() = uid);

-- Permettre au superadmin d'insérer n'importe quel utilisateur
DROP POLICY IF EXISTS "users_insert_superadmin" ON public.users;
CREATE POLICY "users_insert_superadmin" ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 2. VÉRIFICATION de la contrainte CHECK sur role
-- ───────────────────────────────────────────────────────────────────────────
-- La migration 001 définit : CHECK (role IN ('admin', 'manager', 'staff', 'superadmin'))
-- La migration 005 change en   : CHECK (role IN ('superadmin', 'owner', 'manager', 'staff'))
-- Le code crée les utilisateurs avec role = 'owner'
-- Si seule la migration 001 a été appliquée, la contrainte échoue.
-- ───────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Vérifier si la contrainte actuelle interdit 'owner'
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'users'
      AND ccu.column_name = 'role'
      AND cc.check_clause NOT LIKE '%owner%'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check
      CHECK (role IN ('superadmin', 'owner', 'manager', 'staff'));
    RAISE NOTICE '✅ Contrainte role mise à jour pour inclure owner';
  ELSE
    RAISE NOTICE '✅ La contrainte role inclut déjà owner';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. INDEX pour améliorer les performances des requêtes d'inscription
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_uid_role ON public.users(uid, role);

-- ═══════════════════════════════════════════════════════════════════════════
-- END MIGRATION 006
-- ═══════════════════════════════════════════════════════════════════════════
