-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Fix: infinite recursion in RLS policy on public.users
-- ═══════════════════════════════════════════════════════════════════════════
-- Symptom: Postgres error 42P17 "infinite recursion detected in policy for
-- relation \"users\"" when fetching a user's own profile row.
--
-- Root cause: the "users_select" policy contains a raw EXISTS subquery that
-- reads from public.users directly. Because that subquery runs under the
-- same RLS policy it is part of, Postgres re-evaluates the policy on every
-- row it touches, recursing forever.
--
-- Fix: replace the raw subquery with the existing SECURITY DEFINER helper
-- function public.get_current_boutique_id(), which runs as the function
-- owner and therefore bypasses RLS instead of re-triggering it.
--
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users_select" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT USING (
  auth.uid() = uid
  OR public.is_superadmin()
  OR boutique_id = public.get_current_boutique_id()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- END FIX
-- ═══════════════════════════════════════════════════════════════════════════
