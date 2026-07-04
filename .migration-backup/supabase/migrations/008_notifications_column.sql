-- Colonne notifications JSONB pour stocker les préférences par boutique
ALTER TABLE public.boutiques
  ADD COLUMN IF NOT EXISTS notifications jsonb DEFAULT '{}'::jsonb;
