-- Migration 012: Create suppliers and purchases tables for Achats Fournisseurs module

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id TEXT NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone_number TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id TEXT NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  reference TEXT,
  total_amount INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ordered' CHECK (status IN ('draft', 'ordered', 'partial', 'received', 'cancelled')),
  notes TEXT,
  recorded_by TEXT,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  received_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  item_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for suppliers
CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT USING (boutique_id = auth.jwt() ->> 'boutique_id');

CREATE POLICY "suppliers_insert" ON public.suppliers
  FOR INSERT WITH CHECK (boutique_id = auth.jwt() ->> 'boutique_id');

CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE USING (boutique_id = auth.jwt() ->> 'boutique_id');

CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE USING (boutique_id = auth.jwt() ->> 'boutique_id');

-- RLS policies for purchases
CREATE POLICY "purchases_select" ON public.purchases
  FOR SELECT USING (boutique_id = auth.jwt() ->> 'boutique_id');

CREATE POLICY "purchases_insert" ON public.purchases
  FOR INSERT WITH CHECK (boutique_id = auth.jwt() ->> 'boutique_id');

CREATE POLICY "purchases_update" ON public.purchases
  FOR UPDATE USING (boutique_id = auth.jwt() ->> 'boutique_id');

CREATE POLICY "purchases_delete" ON public.purchases
  FOR DELETE USING (boutique_id = auth.jwt() ->> 'boutique_id');

-- RLS policies for purchase_items
CREATE POLICY "purchase_items_select" ON public.purchase_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.purchases WHERE id = purchase_id AND boutique_id = auth.jwt() ->> 'boutique_id')
  );

CREATE POLICY "purchase_items_insert" ON public.purchase_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.purchases WHERE id = purchase_id AND boutique_id = auth.jwt() ->> 'boutique_id')
  );

CREATE POLICY "purchase_items_update" ON public.purchase_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.purchases WHERE id = purchase_id AND boutique_id = auth.jwt() ->> 'boutique_id')
  );

CREATE POLICY "purchase_items_delete" ON public.purchase_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.purchases WHERE id = purchase_id AND boutique_id = auth.jwt() ->> 'boutique_id')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_boutique ON public.suppliers(boutique_id);
CREATE INDEX IF NOT EXISTS idx_purchases_boutique ON public.purchases(boutique_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);
