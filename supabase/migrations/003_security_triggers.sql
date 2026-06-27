-- ═══════════════════════════════════════════════════════════════════════════
-- STOCKPLUS — Migration 003: Indexes, RLS Policies, Functions, Triggers
-- ═══════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. INDEXES ON PRODUCTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_boutique ON public.products(boutique_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(boutique_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(boutique_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(boutique_id, category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(boutique_id, is_active);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. INDEXES ON CUSTOMERS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customers_boutique ON public.customers(boutique_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(boutique_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(boutique_id, full_name);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. INDEXES ON SALES
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sales_boutique ON public.sales(boutique_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(boutique_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(boutique_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(invoice_number);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. INDEXES ON SALE_ITEMS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. INDEXES ON STOCK_MOVES
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stock_moves_boutique ON public.stock_moves(boutique_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON public.stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_type ON public.stock_moves(boutique_id, move_type);
CREATE INDEX IF NOT EXISTS idx_stock_moves_date ON public.stock_moves(boutique_id, move_date DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. INDEXES ON DEBTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_debts_boutique ON public.debts(boutique_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON public.debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(boutique_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON public.debts(boutique_id, due_date);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. INDEXES ON PAYMENTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payments_boutique ON public.payments(boutique_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_debt ON public.payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(boutique_id, payment_date DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. INDEXES ON CHINA_IMPORTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_china_imports_boutique ON public.china_imports(boutique_id);
CREATE INDEX IF NOT EXISTS idx_china_imports_status ON public.china_imports(boutique_id, status);
CREATE INDEX IF NOT EXISTS idx_china_imports_date ON public.china_imports(boutique_id, order_date DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. INDEXES ON INVITATIONS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_invitations_boutique ON public.invitations(boutique_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON public.invitations(expires_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. INDEXES ON AUDIT_LOGS
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_logs_boutique ON public.audit_logs(boutique_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON public.audit_logs(boutique_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. ENABLE RLS ON ALL BUSINESS TABLES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.china_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. RLS — PRODUCTS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "products_select_boutique_member" ON public.products;
CREATE POLICY "products_select_boutique_member" ON public.products FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = products.boutique_id)
    OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin" ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin" ON public.products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. RLS — CUSTOMERS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "customers_select_boutique_member" ON public.customers;
CREATE POLICY "customers_select_boutique_member" ON public.customers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = customers.boutique_id)
  );

DROP POLICY IF EXISTS "customers_insert_admin" ON public.customers;
CREATE POLICY "customers_insert_admin" ON public.customers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "customers_update_admin" ON public.customers;
CREATE POLICY "customers_update_admin" ON public.customers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "customers_delete_admin" ON public.customers;
CREATE POLICY "customers_delete_admin" ON public.customers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. RLS — SALES
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sales_select_boutique_member" ON public.sales;
CREATE POLICY "sales_select_boutique_member" ON public.sales FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = sales.boutique_id)
    OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "sales_insert_staff" ON public.sales;
CREATE POLICY "sales_insert_staff" ON public.sales FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "sales_update_admin" ON public.sales;
CREATE POLICY "sales_update_admin" ON public.sales FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. RLS — SALE_ITEMS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "sale_items_select_boutique_member" ON public.sale_items;
CREATE POLICY "sale_items_select_boutique_member" ON public.sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      JOIN public.users u ON u.boutique_id = s.boutique_id
      WHERE s.id = sale_items.sale_id AND u.uid = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "sale_items_insert_staff" ON public.sale_items;
CREATE POLICY "sale_items_insert_staff" ON public.sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      JOIN public.users u ON u.boutique_id = s.boutique_id
      WHERE s.id = sale_id AND u.uid = auth.uid() AND u.role IN ('admin', 'manager', 'staff')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. RLS — STOCK_MOVES
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "stock_moves_select_boutique_member" ON public.stock_moves;
CREATE POLICY "stock_moves_select_boutique_member" ON public.stock_moves FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = stock_moves.boutique_id)
  );

DROP POLICY IF EXISTS "stock_moves_insert_staff" ON public.stock_moves;
CREATE POLICY "stock_moves_insert_staff" ON public.stock_moves FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager', 'staff'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. RLS — DEBTS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "debts_select_boutique_member" ON public.debts;
CREATE POLICY "debts_select_boutique_member" ON public.debts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = debts.boutique_id)
  );

DROP POLICY IF EXISTS "debts_manage_admin" ON public.debts;
CREATE POLICY "debts_manage_admin" ON public.debts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. RLS — PAYMENTS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "payments_select_boutique_member" ON public.payments;
CREATE POLICY "payments_select_boutique_member" ON public.payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = payments.boutique_id)
  );

DROP POLICY IF EXISTS "payments_insert_admin" ON public.payments;
CREATE POLICY "payments_insert_admin" ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. RLS — CHINA_IMPORTS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "china_imports_select_boutique_member" ON public.china_imports;
CREATE POLICY "china_imports_select_boutique_member" ON public.china_imports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND boutique_id = china_imports.boutique_id)
  );

DROP POLICY IF EXISTS "china_imports_insert_admin" ON public.china_imports;
CREATE POLICY "china_imports_insert_admin" ON public.china_imports FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "china_imports_update_admin" ON public.china_imports;
CREATE POLICY "china_imports_update_admin" ON public.china_imports FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role IN ('admin', 'manager'))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 20. RLS — INVITATIONS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "invitations_select_admin" ON public.invitations;
CREATE POLICY "invitations_select_admin" ON public.invitations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = invitations.boutique_id AND u.role IN ('admin'))
  );

DROP POLICY IF EXISTS "invitations_insert_admin" ON public.invitations;
CREATE POLICY "invitations_insert_admin" ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "invitations_update_admin" ON public.invitations;
CREATE POLICY "invitations_update_admin" ON public.invitations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = boutique_id AND u.role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 21. RLS — AUDIT_LOGS
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid() AND u.boutique_id = audit_logs.boutique_id AND u.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 22. MATERIALIZED VIEW — Daily Sales Summary
-- ═══════════════════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_sales_summary AS
SELECT
  s.boutique_id,
  DATE(s.sale_date) as sale_date,
  COUNT(*) as total_transactions,
  SUM(s.total_amount) as total_revenue,
  SUM(s.discount_amount) as total_discounts,
  COUNT(DISTINCT s.customer_id) as unique_customers
FROM public.sales s
WHERE s.is_void = false
GROUP BY s.boutique_id, DATE(s.sale_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_summary_unique
  ON public.daily_sales_summary(boutique_id, sale_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- 23. FUNCTION — Update product stock when sale item is created
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET quantity_in_stock = quantity_in_stock - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 24. TRIGGER — Decrement stock on sale item insert
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_update_stock_on_sale_item ON public.sale_items;
CREATE TRIGGER trigger_update_stock_on_sale_item
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_on_sale();

-- ═══════════════════════════════════════════════════════════════════════════
-- 25. FUNCTION — Restore stock when sale is voided
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.restore_stock_on_void_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_void = true AND OLD.is_void = false THEN
    UPDATE public.products p
    SET quantity_in_stock = p.quantity_in_stock + si.quantity
    FROM public.sale_items si
    WHERE si.sale_id = NEW.id AND p.id = si.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_restore_stock_on_void ON public.sales;
CREATE TRIGGER trigger_restore_stock_on_void
AFTER UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_void_sale();

-- ═══════════════════════════════════════════════════════════════════════════
-- 26. FUNCTION — Auto-create audit log on table changes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_boutique_id text;
BEGIN
  v_boutique_id := COALESCE(
    NEW.boutique_id,
    OLD.boutique_id,
    (SELECT boutique_id FROM public.users WHERE uid = auth.uid() LIMIT 1)
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, new_values, status)
    VALUES (v_boutique_id, auth.uid(), 'create', TG_TABLE_NAME, CAST(NEW.id AS text), row_to_json(NEW)::jsonb, 'success');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, old_values, new_values, status)
    VALUES (v_boutique_id, auth.uid(), 'update', TG_TABLE_NAME, CAST(NEW.id AS text), row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, 'success');
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (boutique_id, actor_id, action, entity_type, entity_id, old_values, status)
    VALUES (v_boutique_id, auth.uid(), 'delete', TG_TABLE_NAME, CAST(OLD.id AS text), row_to_json(OLD)::jsonb, 'success');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 27. TRIGGER — Audit sales changes
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_audit_sales ON public.sales;
CREATE TRIGGER trigger_audit_sales
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_trail();

-- ═══════════════════════════════════════════════════════════════════════════
-- 28. TRIGGER — Audit product changes
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_audit_products ON public.products;
CREATE TRIGGER trigger_audit_products
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_trail();

-- ═══════════════════════════════════════════════════════════════════════════
-- 29. TRIGGER — Audit customer changes
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_audit_customers ON public.customers;
CREATE TRIGGER trigger_audit_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_trail();

-- ═══════════════════════════════════════════════════════════════════════════
-- END MIGRATION 003
-- ═══════════════════════════════════════════════════════════════════════════
