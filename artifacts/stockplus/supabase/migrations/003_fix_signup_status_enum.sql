-- ============================================================
-- Fix : créer l'enum boutique_status si elle n'existe pas
-- et ajouter 'en_attente'
-- ============================================================
-- Problème : l'enum boutique_status n'existe pas dans la base
-- Supabase. La colonne status de la table boutiques est
-- probablement de type text. On crée l'enum et on convertit
-- la colonne si nécessaire.
-- ============================================================

-- 1. Créer l'enum boutique_status si elle n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'boutique_status') then
    create type boutique_status as enum ('Essai', 'Actif', 'Suspendu', 'refuse', 'en_attente');
  else
    -- Si l'enum existe mais sans 'en_attente', l'ajouter
    if not exists (
      select 1 from pg_enum
      where enumlabel = 'en_attente'
      and enumtypid = (select oid from pg_type where typname = 'boutique_status')
    ) then
      alter type boutique_status add value 'en_attente';
    end if;
  end if;
end $$;

-- 2. Si la colonne status est de type text, la convertir en boutique_status
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'boutiques'
    and column_name = 'status'
    and data_type = 'text'
  ) then
    -- Supprimer la valeur par défaut existante
    execute 'alter table public.boutiques alter column status drop default';
    -- Convertir le type
    execute 'alter table public.boutiques alter column status type boutique_status using status::text::boutique_status';
    -- Remettre la valeur par défaut
    execute 'alter table public.boutiques alter column status set default ''Essai''::boutique_status';
  end if;
end $$;

-- 3. Créer la table notifications si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id TEXT,
  user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Vérification
SELECT 'Migration 003 appliquée avec succès' as status;