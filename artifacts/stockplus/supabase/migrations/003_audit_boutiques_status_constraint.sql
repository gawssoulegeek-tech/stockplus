-- ============================================================
-- Audit et documentation de la contrainte CHECK sur boutiques.status
-- ============================================================
-- À exécuter dans Supabase SQL Editor pour diagnostiquer le problème
-- d'inscription qui échouait avec 'en_attente'.
-- ============================================================

-- 1. Voir la contrainte CHECK actuelle sur boutiques.status
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'boutiques'
  AND con.contype = 'c';  -- 'c' = CHECK

-- 2. Voir toutes les colonnes de boutiques avec leur type et contraintes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'boutiques'
ORDER BY ordinal_position;

-- 3. Lister toutes les contraintes de la table boutiques (FK, CHECK, UNIQUE)
SELECT
  con.conname,
  con.contype,
  pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'boutiques';

-- 4. Lister les triggers sur boutiques et users
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('boutiques', 'users')
ORDER BY event_object_table, trigger_name;

-- 5. Voir les politiques RLS sur boutiques
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('boutiques', 'users')
ORDER BY tablename, policyname;

-- ============================================================
-- OPTIONNEL : Si vous voulez autoriser 'en_attente' comme statut valide
-- ============================================================
-- ATTENTION : à exécuter seulement si vous voulez vraiment utiliser 'en_attente'
-- au lieu de 'Suspendu' pour les nouvelles inscriptions.

-- D'abord trouver le nom de la contrainte CHECK (résultat de la requête 1)
-- puis la supprimer et la recréer avec 'en_attente' inclus :

-- ALTER TABLE public.boutiques DROP CONSTRAINT <nom_de_la_contrainte>;
-- ALTER TABLE public.boutiques ADD CONSTRAINT boutiques_status_check
--   CHECK (status IN ('Essai', 'Actif', 'Suspendu', 'refuse', 'en_attente'));
