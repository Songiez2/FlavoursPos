-- Additive migration for Flavours cloud backup, notifications, and payments.
-- Does not drop, truncate, or rewrite existing business data.

create table if not exists public.flavours_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  backup jsonb not null check (jsonb_typeof(backup) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.flavours_backups enable row level security;
drop policy if exists "Users can read own Flavours backup" on public.flavours_backups;
create policy "Users can read own Flavours backup" on public.flavours_backups
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own Flavours backup" on public.flavours_backups;
create policy "Users can create own Flavours backup" on public.flavours_backups
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own Flavours backup" on public.flavours_backups;
create policy "Users can update own Flavours backup" on public.flavours_backups
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.flavours_backups to authenticated;
revoke all on public.flavours_backups from anon;

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  categories jsonb not null default '{"low_stock":true,"out_of_stock":true,"purchases":true,"purchase_changes":true,"supplier_payments":true,"sales":false,"large_sales":true,"credit_sales":true,"customer_payments":true,"expenses":false,"stock_adjustments":true,"cash_closing":true,"payment_status":true,"refunds":true,"new_staff":true,"security":true}'::jsonb,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(categories) = 'object')
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null check (jsonb_typeof(subscription) = 'object'),
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique(user_id, endpoint)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  category text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, event_id)
);

create table if not exists public.notification_delivery_logs (
  id bigint generated always as identity primary key,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  attempt integer not null default 1 check (attempt > 0),
  outcome text not null check (outcome in ('sent','retry','failed','expired')),
  http_status integer,
  error_message text,
  attempted_at timestamptz not null default now()
);

-- Only public gateway metadata belongs here. Lipila API keys and webhook secrets
-- must be stored as Supabase Function secrets, never in this table.
create table if not exists public.payment_gateway_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  environment text not null default 'sandbox' check (environment in ('sandbox','production')),
  merchant_id text,
  merchant_chat_id text,
  currency text not null default 'ZMW' check (currency = 'ZMW'),
  timeout_seconds integer not null default 300 check (timeout_seconds between 30 and 1800),
  methods jsonb not null default '{"airtel_money":true,"mtn_money":true,"zamtel_money":true,"visa":true,"mastercard":true}'::jsonb,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(methods) = 'object')
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_reference text not null,
  reference_id text not null unique,
  lipila_identifier text,
  method text not null check (method in ('airtel_money','mtn_money','zamtel_money','visa','mastercard')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'ZMW' check (currency = 'ZMW'),
  status text not null default 'pending' check (status in ('pending','processing','successful','failed','cancelled','expired','refunded')),
  payer text,
  checkout_url text,
  provider_reference text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, sale_reference)
);

create table if not exists public.payment_webhook_events (
  webhook_id text primary key,
  reference_id text not null,
  event_payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
  refund_reference text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','successful','failed')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists delivery_logs_notification_idx on public.notification_delivery_logs(notification_id, attempted_at desc);
create index if not exists payment_transactions_user_created_idx on public.payment_transactions(user_id, created_at desc);
create index if not exists payment_transactions_user_status_idx on public.payment_transactions(user_id, status, method);
create index if not exists payment_webhook_reference_idx on public.payment_webhook_events(reference_id);
create index if not exists payment_refunds_user_created_idx on public.payment_refunds(user_id, created_at desc);

create or replace function public.flavours_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
drop trigger if exists flavours_backups_set_updated_at on public.flavours_backups;
create trigger flavours_backups_set_updated_at before update on public.flavours_backups
  for each row execute function public.flavours_set_updated_at();
drop trigger if exists payment_gateway_settings_set_updated_at on public.payment_gateway_settings;
create trigger payment_gateway_settings_set_updated_at before update on public.payment_gateway_settings
  for each row execute function public.flavours_set_updated_at();
drop trigger if exists payment_transactions_set_updated_at on public.payment_transactions;
create trigger payment_transactions_set_updated_at before update on public.payment_transactions
  for each row execute function public.flavours_set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['notification_settings','push_subscriptions','notifications','notification_delivery_logs','payment_gateway_settings','payment_transactions','payment_webhook_events','payment_refunds'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "Owners manage their notification settings" on public.notification_settings;
create policy "Owners manage their notification settings" on public.notification_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Owners manage their push devices" on public.push_subscriptions;
create policy "Owners manage their push devices" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Owners read their notifications" on public.notifications;
create policy "Owners read their notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Owners read their delivery logs" on public.notification_delivery_logs;
create policy "Owners read their delivery logs" on public.notification_delivery_logs
  for select to authenticated using (exists (
    select 1 from public.notifications n where n.id = notification_id and n.user_id = auth.uid()
  ));
drop policy if exists "Owners manage their payment gateway settings" on public.payment_gateway_settings;
create policy "Owners manage their payment gateway settings" on public.payment_gateway_settings
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Owners read their payment transactions" on public.payment_transactions;
create policy "Owners read their payment transactions" on public.payment_transactions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Owners read their refunds" on public.payment_refunds;
create policy "Owners read their refunds" on public.payment_refunds
  for select to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.notification_settings, public.push_subscriptions, public.payment_gateway_settings to authenticated;
grant select on public.notifications, public.notification_delivery_logs, public.payment_transactions, public.payment_refunds to authenticated;
revoke all on public.notification_settings, public.push_subscriptions, public.notifications,
  public.notification_delivery_logs, public.payment_gateway_settings, public.payment_transactions,
  public.payment_webhook_events, public.payment_refunds from anon;
revoke all on public.payment_webhook_events from authenticated;

