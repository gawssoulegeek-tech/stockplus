-- ============================================================
-- Migration 010 : Garantir que toutes les colonnes nécessaires existent
-- Idempotent : peut être exécuté plusieurs fois sans erreur
-- Corrige les problèmes de pages vides (ventes, mouvements, clients)
-- ============================================================

-- ============================================================
-- TABLE sales : ajouter seller_name si manquant
-- ============================================================
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- ============================================================
-- TABLE customers : renommer les colonnes si elles existent encore
-- avec l'ancien nom (schéma 000), puis ajouter les colonnes manquantes
-- ============================================================
DO $$ BEGIN
  -- name -> full_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='full_name') THEN
    ALTER TABLE public.customers RENAME COLUMN name TO full_name;
  END IF;

  -- type -> customer_type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='customer_type') THEN
    ALTER TABLE public.customers RENAME COLUMN type TO customer_type;
  END IF;

  -- phone -> phone_number
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='phone')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='phone_number') THEN
    ALTER TABLE public.customers RENAME COLUMN phone TO phone_number;
  END IF;

  -- address -> street_address
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='address')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='street_address') THEN
    ALTER TABLE public.customers RENAME COLUMN address TO street_address;
  END IF;

  -- last_purchase_date -> last_purchase_at
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='last_purchase_date')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='last_purchase_at') THEN
    ALTER TABLE public.customers RENAME COLUMN last_purchase_date TO last_purchase_at;
  END IF;
END $$;

-- Ajouter les colonnes manquantes (idempotent)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type customer_type DEFAULT 'individual';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Si full_name est NULL mais que l'ancienne colonne 'name' contenait des donnees,
-- copier les valeurs (au cas ou le RENAME n'aurait pas pu se faire)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='name') THEN
    EXECUTE 'UPDATE public.customers SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL';
  END IF;
END $$;

-- ============================================================
-- TABLE debts : renommer les colonnes si necessaire
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='amount_due')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='original_amount') THEN
    ALTER TABLE public.debts RENAME COLUMN amount_due TO original_amount;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='amount_paid')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='remaining_amount') THEN
    ALTER TABLE public.debts RENAME COLUMN amount_paid TO remaining_amount;
  END IF;
END $$;

ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS reason TEXT;

-- ============================================================
-- TABLE products : ajouter unit_of_measure si manquant
-- (le code utilise unit_of_measure, mais le schema 000 a 'unit')
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='unit_of_measure') THEN
    ALTER TABLE public.products RENAME COLUMN unit TO unit_of_measure;
  END IF;
END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'pcs';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_content INTEGER DEFAULT 1;

-- ============================================================
-- VERIFICATION : afficher l'etat des colonnes pour debug
-- ============================================================
SELECT 'sales columns' as check_name, string_agg(column_name, ', ') as columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name='sales'
UNION ALL
SELECT 'customers columns', string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_schema='public' AND table_name='customers'
UNION ALL
SELECT 'products columns', string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_schema='public' AND table_name='products';