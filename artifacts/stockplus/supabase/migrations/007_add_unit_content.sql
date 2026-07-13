-- ============================================================
-- Migration 007 : Ajout colonne unit_content dans products
-- ============================================================
-- Permet de stocker combien d'unités de base contient chaque unité
-- Ex: 1 carton = 24 pièces → unit_content = 24
-- ============================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit_content INTEGER DEFAULT 1;

-- Vérification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name = 'unit_content';

SELECT 'unit_content column added to products table' as status;
