-- ============================================================
-- StockPlus — Sync DB function get_features_for_plan with TS code
-- Added: `purchases` flag missing from the previous version
-- ============================================================

create or replace function public.get_features_for_plan(plan_name text)
returns jsonb
language plpgsql
stable
as $$
begin
  return case plan_name
    when 'Essai' then jsonb_build_object(
      'wholesale', false, 'credit', false, 'customers', true,
      'units', false, 'chinaImport', false, 'advancedReports', false,
      'multiCart', false, 'stockIncrement', true, 'historicalMoves', false,
      'supplierInvoiceScan', false, 'crm', false, 'autoRelance', false,
      'comptabilite', false, 'exportComptable', false, 'purchases', false,
      'ecommerce', false
    )
    when 'Basic' then jsonb_build_object(
      'wholesale', false, 'credit', false, 'customers', true,
      'units', false, 'chinaImport', false, 'advancedReports', false,
      'multiCart', false, 'stockIncrement', true, 'historicalMoves', false,
      'supplierInvoiceScan', false, 'crm', false, 'autoRelance', false,
      'comptabilite', false, 'exportComptable', false, 'purchases', false,
      'ecommerce', false
    )
    when 'Pro' then jsonb_build_object(
      'wholesale', true, 'credit', true, 'customers', true,
      'units', true, 'chinaImport', false, 'advancedReports', true,
      'multiCart', true, 'stockIncrement', true, 'historicalMoves', true,
      'supplierInvoiceScan', true, 'crm', true, 'autoRelance', true,
      'comptabilite', true, 'exportComptable', true, 'purchases', true,
      'ecommerce', false
    )
    when 'Premium' then jsonb_build_object(
      'wholesale', true, 'credit', true, 'customers', true,
      'units', true, 'chinaImport', false, 'advancedReports', true,
      'multiCart', true, 'stockIncrement', true, 'historicalMoves', true,
      'supplierInvoiceScan', true, 'crm', true, 'autoRelance', true,
      'comptabilite', true, 'exportComptable', true, 'purchases', true,
      'ecommerce', false
    )
    else jsonb_build_object(
      'wholesale', false, 'credit', false, 'customers', true,
      'units', false, 'chinaImport', false, 'advancedReports', false,
      'multiCart', false, 'stockIncrement', true, 'historicalMoves', false,
      'supplierInvoiceScan', false, 'crm', false, 'autoRelance', false,
      'comptabilite', false, 'exportComptable', false, 'purchases', false,
      'ecommerce', false
    )
  end;
end;
$$;
