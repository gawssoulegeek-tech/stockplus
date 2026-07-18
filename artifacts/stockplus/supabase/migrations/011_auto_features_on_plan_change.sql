-- ============================================================
-- StockPlus — Auto-update features when plan changes
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
      'comptabilite', false, 'exportComptable', false, 'ecommerce', false
    )
    when 'Basic' then jsonb_build_object(
      'wholesale', false, 'credit', false, 'customers', true,
      'units', false, 'chinaImport', false, 'advancedReports', false,
      'multiCart', false, 'stockIncrement', true, 'historicalMoves', false,
      'supplierInvoiceScan', false, 'crm', false, 'autoRelance', false,
      'comptabilite', false, 'exportComptable', false, 'ecommerce', false
    )
    when 'Pro' then jsonb_build_object(
      'wholesale', true, 'credit', true, 'customers', true,
      'units', true, 'chinaImport', false, 'advancedReports', true,
      'multiCart', true, 'stockIncrement', true, 'historicalMoves', true,
      'supplierInvoiceScan', true, 'crm', true, 'autoRelance', true,
      'comptabilite', true, 'exportComptable', true, 'ecommerce', false
    )
    when 'Premium' then jsonb_build_object(
      'wholesale', true, 'credit', true, 'customers', true,
      'units', true, 'chinaImport', false, 'advancedReports', true,
      'multiCart', true, 'stockIncrement', true, 'historicalMoves', true,
      'supplierInvoiceScan', true, 'crm', true, 'autoRelance', true,
      'comptabilite', true, 'exportComptable', true, 'ecommerce', false
    )
    else jsonb_build_object(
      'wholesale', false, 'credit', false, 'customers', true,
      'units', false, 'chinaImport', false, 'advancedReports', false,
      'multiCart', false, 'stockIncrement', true, 'historicalMoves', false,
      'supplierInvoiceScan', false, 'crm', false, 'autoRelance', false,
      'comptabilite', false, 'exportComptable', false, 'ecommerce', false
    )
  end;
end;
$$;

-- Trigger function: auto-set features before insert or update on boutiques
create or replace function public.boutiques_auto_features()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan then
    new.features = public.get_features_for_plan(new.plan);
  end if;
  return new;
end;
$$;

drop trigger if exists "trg_boutiques_auto_features" on public.boutiques;
create trigger "trg_boutiques_auto_features"
  before insert or update of plan
  on public.boutiques
  for each row
  execute function public.boutiques_auto_features();
