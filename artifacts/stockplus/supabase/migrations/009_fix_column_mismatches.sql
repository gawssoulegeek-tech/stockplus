-- ============================================================
-- Fix column name mismatches between DB schema and TypeScript
-- Idempotent : peut être exécuté plusieurs fois sans erreur
-- ============================================================

-- Fix customers table: rename columns to match TypeScript interface
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='name') THEN
    ALTER TABLE public.customers RENAME COLUMN name TO full_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='type') THEN
    ALTER TABLE public.customers RENAME COLUMN type TO customer_type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='phone') THEN
    ALTER TABLE public.customers RENAME COLUMN phone TO phone_number;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='address') THEN
    ALTER TABLE public.customers RENAME COLUMN address TO street_address;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name='last_purchase_date') THEN
    ALTER TABLE public.customers RENAME COLUMN last_purchase_date TO last_purchase_at;
  END IF;
END $$;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0;

-- Fix sales table: add missing seller_name column
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- Fix debts table: rename columns to match TypeScript interface
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='amount_due') THEN
    ALTER TABLE public.debts RENAME COLUMN amount_due TO original_amount;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='debts' AND column_name='amount_paid') THEN
    ALTER TABLE public.debts RENAME COLUMN amount_paid TO remaining_amount;
  END IF;
END $$;

ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS reason TEXT;
