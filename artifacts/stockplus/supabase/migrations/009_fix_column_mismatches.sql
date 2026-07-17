-- ============================================================
-- Fix column name mismatches between DB schema and TypeScript
-- ============================================================

-- Fix customers table: rename columns to match TypeScript interface
ALTER TABLE public.customers RENAME COLUMN name TO full_name;
ALTER TABLE public.customers RENAME COLUMN type TO customer_type;
ALTER TABLE public.customers RENAME COLUMN phone TO phone_number;
ALTER TABLE public.customers RENAME COLUMN address TO street_address;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.customers RENAME COLUMN last_purchase_date TO last_purchase_at;

-- Fix sales table: add missing seller_name column
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- Fix debts table: rename columns to match TypeScript interface
ALTER TABLE public.debts RENAME COLUMN amount_due TO original_amount;
ALTER TABLE public.debts RENAME COLUMN amount_paid TO remaining_amount;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS reason TEXT;
