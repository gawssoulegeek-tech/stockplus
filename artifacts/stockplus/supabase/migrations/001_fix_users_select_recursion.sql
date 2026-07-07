-- ============================================================
-- Fix RLS : éviter la récursion 42P17 sur users
-- ============================================================
-- Problème : la politique users_select_own peut boucler si elle
-- s'appuie sur get_current_boutique_id() qui lit la table users.
-- Solution : utiliser une jointure sûre ou is_superadmin() seul.
-- ============================================================

-- Désactiver puis réactiver RLS pour nettoyer le cache politique
alter table public.users disable row level security;
alter table public.users enable row level security;

-- Politique SELECT : superadmin OU user lui-même OU même boutique
-- ⚠️ On évite get_current_boutique_id() pour casser la récursion
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (
    public.is_superadmin()
    or uid = auth.uid()
    or boutique_id in (
      select u2.boutique_id from public.users u2
      where u2.uid = auth.uid()
      and u2.boutique_id is not null
    )
  );

-- Politique UPDATE : seulement soi-même ou superadmin
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (
    public.is_superadmin()
    or uid = auth.uid()
  );

-- Politique INSERT : soi-même (signup) ou superadmin
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (
    public.is_superadmin()
    or uid = auth.uid()
  );

-- ============================================================
-- Test : vérifier qu'aucune politique ne boucle
-- ============================================================
-- Si vous obtenez une erreur 42P17 (infinite recursion), c'est
-- qu'une politique s'appuie sur la même table qu'elle protège.
-- Solution : passer la fonction en SECURITY DEFINER + SET search_path.
-- ============================================================
