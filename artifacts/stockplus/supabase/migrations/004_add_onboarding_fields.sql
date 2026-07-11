-- ============================================================
-- Ajout des champs d'onboarding dans la table users
-- ============================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Ajouter les colonnes d'onboarding
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS business_sector TEXT,
ADD COLUMN IF NOT EXISTS business_team_size TEXT,
ADD COLUMN IF NOT EXISTS business_monthly_revenue TEXT,
ADD COLUMN IF NOT EXISTS business_expectations TEXT;

-- 2. Vérifier les colonnes ajoutées
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name LIKE 'onboarding_%' OR column_name LIKE 'business_%'
ORDER BY ordinal_position;

-- 3. Vérification
SELECT 'Onboarding columns added to users table' as status;
