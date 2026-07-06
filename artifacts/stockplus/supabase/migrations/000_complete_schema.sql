-- ============================================================
-- StockPlus — Schéma complet de la base de données
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type user_role as enum ('owner', 'manager', 'staff', 'superadmin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type boutique_plan as enum ('Essai', 'Basic', 'Pro', 'Premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type boutique_status as enum ('Essai', 'Actif', 'Suspendu', 'refuse', 'en_attente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_type as enum ('retail', 'wholesale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'card', 'credit', 'mobile');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('complete', 'partial', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customer_type as enum ('individual', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type debt_status as enum ('active', 'partial', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_move_type as enum ('purchase', 'sale', 'adjustment', 'return', 'damage');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_status as enum ('ordered', 'shipped', 'in_transit', 'received', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invitation_status as enum ('pending', 'accepted', 'declined', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_action as enum ('create', 'update', 'delete', 'export');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_status as enum ('success', 'failure', 'warning');
exception when duplicate_object then null; end $$;

-- ============================================================
-- TABLES
-- ============================================================

-- BOUTIQUES
create table if not exists public.boutiques (
  id text primary key,
  name text not null,
  owner_id text,
  plan boutique_plan not null default 'Basic',
  status boutique_status not null default 'Essai',
  trial_ends_at timestamptz,
  features jsonb default '{}'::jsonb,
  team_members_count integer default 1,
  is_active boolean default true,
  notifications jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- USERS
create table if not exists public.users (
  uid text primary key,
  email text not null unique,
  name text,
  role user_role not null default 'manager',
  boutique_id text references public.boutiques(id) on delete set null,
  permissions jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_users_boutique_id on public.users(boutique_id);

-- PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  category text,
  description text,
  cost_price numeric(12,2) default 0,
  price_retail numeric(12,2) default 0,
  price_wholesale numeric(12,2) default 0,
  quantity_in_stock integer not null default 0,
  reorder_level integer default 5,
  unit text,
  image_url text,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_boutique_id on public.products(boutique_id);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_barcode on public.products(barcode);

-- CUSTOMERS
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  name text not null,
  type customer_type default 'individual',
  phone text,
  email text,
  address text,
  notes text,
  total_purchases numeric(12,2) default 0,
  last_purchase_date timestamptz,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_customers_boutique_id on public.customers(boutique_id);

-- SALES
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  sale_type sale_type default 'retail',
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  invoice_number text,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) default 0,
  discount_amount numeric(12,2) default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) default 0,
  payment_method payment_method default 'cash',
  payment_status payment_status default 'complete',
  discount_reason text,
  void_reason text,
  is_void boolean default false,
  notes text,
  sale_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_sales_boutique_id on public.sales(boutique_id);
create index if not exists idx_sales_sale_date on public.sales(sale_date);
create index if not exists idx_sales_customer_id on public.sales(customer_id);

-- SALE ITEMS
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  is_wholesale_price boolean default false,
  item_total numeric(12,2) not null,
  discount_amount numeric(12,2) default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items(product_id);

-- STOCK MOVES
create table if not exists public.stock_moves (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  move_type stock_move_type not null,
  quantity_change integer not null,
  reference_type text,
  reference_id text,
  reason text,
  recorded_by text,
  notes text,
  move_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_moves_boutique_id on public.stock_moves(boutique_id);
create index if not exists idx_stock_moves_product_id on public.stock_moves(product_id);
create index if not exists idx_stock_moves_move_type on public.stock_moves(move_type);

-- PAYMENTS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  amount numeric(12,2) not null,
  payment_method payment_method,
  status text default 'pending',
  reference text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_boutique_id on public.payments(boutique_id);

-- DEBTS (crédits clients)
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  amount_due numeric(12,2) not null default 0,
  amount_paid numeric(12,2) default 0,
  status debt_status default 'active',
  due_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_debts_boutique_id on public.debts(boutique_id);
create index if not exists idx_debts_customer_id on public.debts(customer_id);

-- CHINA IMPORTS (imports de stock)
create table if not exists public.china_imports (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  reference text,
  supplier text,
  total_cost numeric(12,2) default 0,
  shipping_cost numeric(12,2) default 0,
  customs_cost numeric(12,2) default 0,
  currency text default 'CNY',
  status import_status default 'ordered',
  estimated_arrival date,
  received_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_china_imports_boutique_id on public.china_imports(boutique_id);

-- INVITATIONS
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  email text not null,
  role user_role not null default 'manager',
  permissions jsonb default '{}'::jsonb,
  status invitation_status default 'pending',
  token text unique,
  invited_by text,
  accepted_by text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_invitations_boutique_id on public.invitations(boutique_id);
create index if not exists idx_invitations_email on public.invitations(email);

-- AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  boutique_id text references public.boutiques(id) on delete cascade,
  user_id text,
  user_email text,
  action audit_action not null,
  status audit_status default 'success',
  entity_type text,
  entity_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_boutique_id on public.audit_logs(boutique_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  user_id text,
  type text,
  title text,
  message text,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_boutique_id on public.notifications(boutique_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- QUOTATIONS (devis)
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  boutique_id text not null references public.boutiques(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  quote_number text,
  items jsonb default '[]'::jsonb,
  subtotal numeric(12,2) default 0,
  tax_amount numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  status text default 'draft',
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_quotations_boutique_id on public.quotations(boutique_id);

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Retourne le user_id courant (auth.uid())
create or replace function auth.uid()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    nullif(current_setting('request.jwt.claims', true)::json->>'user_id', '')
  );
$$;

-- Vérifie si l'utilisateur courant est superadmin
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()
    and role = 'superadmin'
  );
$$;

-- Récupère la boutique_id de l'utilisateur courant
create or replace function public.get_current_boutique_id()
returns text
language sql
security definer
set search_path = public
as $$
  select boutique_id from public.users where uid = auth.uid() limit 1;
$$;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.boutiques enable row level security;
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_moves enable row level security;
alter table public.payments enable row level security;
alter table public.debts enable row level security;
alter table public.china_imports enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.quotations enable row level security;

-- POLITIQUES BOUTIQUES
-- Superadmin : tout voir. Owner/manager : voir sa propre boutique.
drop policy if exists "boutiques_select_own_or_superadmin" on public.boutiques;
create policy "boutiques_select_own_or_superadmin" on public.boutiques
  for select using (
    public.is_superadmin()
    or id = public.get_current_boutique_id()
  );

drop policy if exists "boutiques_update_own" on public.boutiques;
create policy "boutiques_update_own" on public.boutiques
  for update using (
    public.is_superadmin()
    or id = public.get_current_boutique_id()
  );

-- POLITIQUES USERS
-- Un user peut se lire lui-même, et les membres de sa boutique
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (
    public.is_superadmin()
    or uid = auth.uid()
    or boutique_id = public.get_current_boutique_id()
  );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (
    public.is_superadmin()
    or uid = auth.uid()
  );

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (
    public.is_superadmin()
    or uid = auth.uid()
  );

-- POLITIQUES GÉNÉRIQUES (boutique-scoped)
-- Les tables "métier" ne sont visibles/modifiables que par les membres de la boutique

-- Helper : toutes les tables qui ont boutique_id utilisent le même pattern
do $$
declare
  t text;
  tables text[] := array['products','customers','sales','stock_moves','payments','debts','china_imports','invitations','audit_logs','notifications','quotations'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%s_select_own" on public.%s', t, t);
    execute format('create policy "%s_select_own" on public.%s for select using (public.is_superadmin() or boutique_id = public.get_current_boutique_id())', t, t);

    execute format('drop policy if exists "%s_insert_own" on public.%s', t, t);
    execute format('create policy "%s_insert_own" on public.%s for insert with check (public.is_superadmin() or boutique_id = public.get_current_boutique_id())', t, t);

    execute format('drop policy if exists "%s_update_own" on public.%s', t, t);
    execute format('create policy "%s_update_own" on public.%s for update using (public.is_superadmin() or boutique_id = public.get_current_boutique_id())', t, t);

    execute format('drop policy if exists "%s_delete_own" on public.%s', t, t);
    execute format('create policy "%s_delete_own" on public.%s for delete using (public.is_superadmin() or boutique_id = public.get_current_boutique_id())', t, t);
  end loop;
end $$;

-- SALE_ITEMS : hérite des sales (pas de boutique_id direct)
drop policy if exists "sale_items_select_own" on public.sale_items;
create policy "sale_items_select_own" on public.sale_items
  for select using (
    public.is_superadmin()
    or exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
      and sales.boutique_id = public.get_current_boutique_id()
    )
  );

drop policy if exists "sale_items_insert_own" on public.sale_items;
create policy "sale_items_insert_own" on public.sale_items
  for insert with check (
    public.is_superadmin()
    or exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
      and sales.boutique_id = public.get_current_boutique_id()
    )
  );

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
