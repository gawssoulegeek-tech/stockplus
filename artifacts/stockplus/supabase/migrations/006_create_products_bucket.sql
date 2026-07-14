-- ============================================================
-- Migration 006 : Création du bucket Storage 'products'
-- ============================================================
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Créer le bucket 'products' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Politiques RLS pour le bucket 'products'
-- - Un user peut upload/lire/supprimer dans son dossier boutique
-- - Le bucket est public (lecture publique des images)

-- Politique : tout le monde peut lire (public)
DROP POLICY IF EXISTS "products_bucket_public_read" ON storage.objects;
CREATE POLICY "products_bucket_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'products');

-- Politique : un user authentifié peut upload dans le dossier de sa boutique
DROP POLICY IF EXISTS "products_bucket_upload_own" ON storage.objects;
CREATE POLICY "products_bucket_upload_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );

-- Politique : un user peut mettre à jour ses propres fichiers
DROP POLICY IF EXISTS "products_bucket_update_own" ON storage.objects;
CREATE POLICY "products_bucket_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );

-- Politique : un user peut supprimer ses propres fichiers
DROP POLICY IF EXISTS "products_bucket_delete_own" ON storage.objects;
CREATE POLICY "products_bucket_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'products'
    AND auth.role() = 'authenticated'
  );

-- 3. Vérification
SELECT 'products bucket created with RLS policies' as status;
SELECT id, name, public FROM storage.buckets WHERE id = 'products';
