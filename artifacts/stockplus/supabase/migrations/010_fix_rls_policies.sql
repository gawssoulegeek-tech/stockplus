-- ============================================================
-- StockPlus — Fix RLS policies (explicit, no dynamic SQL)
-- ============================================================

-- Ensure get_current_boutique_id exists
create or replace function public.get_current_boutique_id()
returns text
language sql
security definer
set search_path = public
as $$
  select boutique_id from public.users where uid = auth.uid() limit 1;
$$;

-- Drop ALL old-style policies first (from dynamic SQL)
do $$
declare
  t text;
  tables text[] := array['products','customers','sales','stock_moves','payments','debts','china_imports','invitations','audit_logs','notifications','quotations'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%s_select_own" on public.%s', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%s', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%s', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%s', t, t);
  end loop;
end $$;

-- Drop sale_items old policies
drop policy if exists "sale_items_select_own" on public.sale_items;
drop policy if exists "sale_items_insert_own" on public.sale_items;

-- Drop new-style policies if re-running
do $$ begin

-- SALES
drop policy if exists "Allow select sales for boutique members" on public.sales;
create policy "Allow select sales for boutique members" on public.sales
  for select using (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow insert sales for boutique members" on public.sales;
create policy "Allow insert sales for boutique members" on public.sales
  for insert with check (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow update sales for boutique members" on public.sales;
create policy "Allow update sales for boutique members" on public.sales
  for update using (boutique_id = public.get_current_boutique_id());

-- SALE ITEMS
drop policy if exists "Allow select sale_items for boutique members" on public.sale_items;
create policy "Allow select sale_items for boutique members" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
      and sales.boutique_id = public.get_current_boutique_id()
    )
  );

drop policy if exists "Allow insert sale_items for boutique members" on public.sale_items;
create policy "Allow insert sale_items for boutique members" on public.sale_items
  for insert with check (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
      and sales.boutique_id = public.get_current_boutique_id()
    )
  );

-- STOCK MOVES
drop policy if exists "Allow select stock_moves for boutique members" on public.stock_moves;
create policy "Allow select stock_moves for boutique members" on public.stock_moves
  for select using (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow insert stock_moves for boutique members" on public.stock_moves;
create policy "Allow insert stock_moves for boutique members" on public.stock_moves
  for insert with check (boutique_id = public.get_current_boutique_id());

-- CUSTOMERS
drop policy if exists "Allow select customers for boutique members" on public.customers;
create policy "Allow select customers for boutique members" on public.customers
  for select using (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow insert customers for boutique members" on public.customers;
create policy "Allow insert customers for boutique members" on public.customers
  for insert with check (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow update customers for boutique members" on public.customers;
create policy "Allow update customers for boutique members" on public.customers
  for update using (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow delete customers for boutique members" on public.customers;
create policy "Allow delete customers for boutique members" on public.customers
  for delete using (boutique_id = public.get_current_boutique_id());

-- PRODUCTS
drop policy if exists "Allow select products for boutique members" on public.products;
create policy "Allow select products for boutique members" on public.products
  for select using (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow insert products for boutique members" on public.products;
create policy "Allow insert products for boutique members" on public.products
  for insert with check (boutique_id = public.get_current_boutique_id());

drop policy if exists "Allow update products for boutique members" on public.products;
create policy "Allow update products for boutique members" on public.products
  for update using (boutique_id = public.get_current_boutique_id());

end $$;
