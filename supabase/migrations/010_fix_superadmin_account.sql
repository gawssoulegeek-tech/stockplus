-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 010 : Fix compte superadmin + RLS users.select
-- ═══════════════════════════════════════════════════════════════════════════
-- Problèmes corrigés :
-- 1. RLS sur public.users empêche un user avec boutique_id=NULL de lire son profil
-- 2. Compte root@senestock221 bloqué avec role='owner' et status='Suspendu'
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. FIX RLS : permettre à un utilisateur de lire sa propre ligne
-- ───────────────────────────────────────────────────────────────────────────
-- L'ancienne politique "users_select_boutique_members" nécessite un
-- boutique_id non-null pour lire son profil. Sans cette politique, les
-- utilisateurs avec boutique_id=NULL sont bloqués sur pending-approval.
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (uid = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 2. FIX COMPTE SUPERADMIN root@senestock221
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_uid uuid;
  v_boutique_id text;
  v_orphan_boutique_id text;
BEGIN
  SELECT uid, boutique_id INTO v_uid, v_boutique_id
  FROM public.users
  WHERE email = 'root@senestock221';

  IF v_uid IS NULL THEN
    RAISE NOTICE 'Aucun utilisateur root@senestock221 trouvé.';
    RETURN;
  END IF;

  UPDATE public.users
  SET role = 'superadmin',
      permissions = jsonb_build_object(
        'canManageUsers', true, 'canDeleteSales', true,
        'canManageFeatures', true, 'canViewReports', true,
        'canUseAdvancedIA', true, 'canExportData', true,
        'canManageProducts', true, 'canManageInventory', true
      )
  WHERE uid = v_uid;

  RAISE NOTICE '✅ Utilisateur % passé en superadmin', v_uid;

  IF v_boutique_id IS NOT NULL THEN
    UPDATE public.boutiques
    SET status = 'Actif', trial_ends_at = NULL, is_active = true
    WHERE id = v_boutique_id;
    RAISE NOTICE '✅ Boutique liée % passée en Actif', v_boutique_id;
  ELSE
    SELECT id INTO v_orphan_boutique_id
    FROM public.boutiques WHERE owner_id = v_uid LIMIT 1;

    IF v_orphan_boutique_id IS NOT NULL THEN
      UPDATE public.users SET boutique_id = v_orphan_boutique_id WHERE uid = v_uid;
      UPDATE public.boutiques SET status = 'Actif', trial_ends_at = NULL, is_active = true WHERE id = v_orphan_boutique_id;
      RAISE NOTICE '✅ Boutique orpheline % liée et activée', v_orphan_boutique_id;
    ELSE
      RAISE NOTICE '⚠️ Aucune boutique trouvée pour cet utilisateur.';
    END IF;
  END IF;
END $$;
