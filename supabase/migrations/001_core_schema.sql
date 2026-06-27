-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 001: Core Schema (Auth, Users, Boutiques, Profiles)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run in Supabase SQL Editor or via `supabase migration up`
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ───────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────────────
-- 2. USERS TABLE (linked to auth.users)
-- ───────────────────────────────────────────────────────────────────────────
-- NOTE: boutique_id FK is added AFTER boutiques table is created
-- to avoid circular dependency during initial insert.

CREATE TABLE IF NOT EXISTS public.users (
  uid uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'staff', 'superadmin')),
  boutique_id text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_boutique_id ON public.users(boutique_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. BOUTIQUES TABLE
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.boutiques (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'Essai' CHECK (plan IN ('Essai', 'Basic', 'Pro', 'Premium')),
  status text NOT NULL DEFAULT 'Essai' CHECK (status IN ('Essai', 'Actif', 'Suspendu')),
  description text,
  logo_url text,
  location text,
  phone_number text,
  email text,
  is_active boolean DEFAULT true,
  team_members_count integer DEFAULT 1,
  trial_ends_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  features jsonb DEFAULT '{
    "units": false,
    "wholesale": false,
    "credit": false,
    "customers": false,
    "stockIncrement": true,
    "historicalMoves": false,
    "importChina": false
  }'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boutiques_owner_id ON public.boutiques(owner_id);
CREATE INDEX IF NOT EXISTS idx_boutiques_plan ON public.boutiques(plan);
CREATE INDEX IF NOT EXISTS idx_boutiques_status ON public.boutiques(status);
CREATE INDEX IF NOT EXISTS idx_boutiques_trial_ends_at ON public.boutiques(trial_ends_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. ADD BOUTIQUE FK TO USERS (now that boutiques exists)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD CONSTRAINT fk_users_boutique
  FOREIGN KEY (boutique_id) REFERENCES public.boutiques(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. PROFILES TABLE (extended user info)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone_number text,
  language text DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  timezone text DEFAULT 'Africa/Dakar',
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  last_login_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. ENABLE RLS ON CORE TABLES
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. RLS — USERS
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  USING (auth.uid() = uid);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid);

DROP POLICY IF EXISTS "users_select_superadmin" ON public.users;
CREATE POLICY "users_select_superadmin" ON public.users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "users_select_boutique_members" ON public.users;
CREATE POLICY "users_select_boutique_members" ON public.users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = users.boutique_id)
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 8. RLS — BOUTIQUES
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "boutiques_select_owner" ON public.boutiques;
CREATE POLICY "boutiques_select_owner" ON public.boutiques FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "boutiques_select_member" ON public.boutiques;
CREATE POLICY "boutiques_select_member" ON public.boutiques FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = boutiques.id)
  );

DROP POLICY IF EXISTS "boutiques_update_owner" ON public.boutiques;
CREATE POLICY "boutiques_update_owner" ON public.boutiques FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "boutiques_insert_owner" ON public.boutiques;
CREATE POLICY "boutiques_insert_owner" ON public.boutiques FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 9. RLS — PROFILES
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_superadmin" ON public.profiles;
CREATE POLICY "profiles_select_superadmin" ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- END MIGRATION 001
-- ═══════════════════════════════════════════════════════════════════════════
