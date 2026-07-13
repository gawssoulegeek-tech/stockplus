-- ============================================================
-- Fix RLS : ajout des politiques INSERT/DELETE manquantes
-- ============================================================
-- Problème : boutiques n'a pas de politique INSERT/DELETE.
-- Un superadmin ne peut pas créer de boutique depuis le client
-- (même avec un JWT valide) car RLS bloque toute insertion.
-- ============================================================

-- Politique INSERT : superadmin seulement (via son JWT ou service_role)
drop policy if exists "boutiques_insert_superadmin" on public.boutiques;
create policy "boutiques_insert_superadmin" on public.boutiques
  for insert with check (
    public.is_superadmin()
  );

-- Politique DELETE : superadmin seulement
drop policy if exists "boutiques_delete_superadmin" on public.boutiques;
create policy "boutiques_delete_superadmin" on public.boutiques
  for delete using (
    public.is_superadmin()
  );

-- Politique DELETE sur users : superadmin ou soi-même
-- (nécessaire pour le cleanup en cas d'échec de création)
drop policy if exists "users_delete_own_or_superadmin" on public.users;
create policy "users_delete_own_or_superadmin" on public.users
  for delete using (
    public.is_superadmin()
    or uid = auth.uid()
  );
