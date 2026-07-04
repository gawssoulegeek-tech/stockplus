-- Corrige le compte root@senestock221 créé avant que SUPERADMIN_EMAIL soit défini
-- À exécuter dans Supabase Dashboard → SQL Editor

DO $$
DECLARE
  v_uid uuid;
  v_boutique_id text;
BEGIN
  -- 1. Récupérer l'UID et la boutique de root@senestock221
  SELECT uid, boutique_id INTO v_uid, v_boutique_id
  FROM public.users
  WHERE email = 'root@senestock221';

  IF v_uid IS NULL THEN
    RAISE NOTICE 'Aucun utilisateur root@senestock221 trouvé. Rien à faire.';
    RETURN;
  END IF;

  -- 2. Passer l'utilisateur en superadmin
  UPDATE public.users
  SET role = 'superadmin',
      permissions = jsonb_build_object(
        'canManageUsers', true,
        'canDeleteSales', true,
        'canManageFeatures', true,
        'canViewReports', true,
        'canUseAdvancedIA', true,
        'canExportData', true,
        'canManageProducts', true,
        'canManageInventory', true
      )
  WHERE uid = v_uid;

  RAISE NOTICE 'Utilisateur % passé en superadmin', v_uid;

  -- 3. Si une boutique existe, la passer en Actif
  IF v_boutique_id IS NOT NULL THEN
    UPDATE public.boutiques
    SET status = 'Actif',
        trial_ends_at = NULL,
        is_active = true
    WHERE id = v_boutique_id;

    RAISE NOTICE 'Boutique % passée en Actif', v_boutique_id;
  ELSE
    RAISE NOTICE 'Pas de boutique associée à cet utilisateur.';
  END IF;
END $$;
