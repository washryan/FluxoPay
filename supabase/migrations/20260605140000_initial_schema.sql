create extension if not exists "pgcrypto";

do $$
begin
  create type public.transaction_type as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.category_type as enum ('income', 'expense', 'both');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('cash', 'pix', 'debit_card', 'credit_card', 'bank_transfer', 'other');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.record_source as enum ('web', 'telegram', 'import');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.bill_status as enum ('pending', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.recurrence_frequency as enum ('none', 'weekly', 'monthly', 'yearly');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.telegram_link_status as enum ('pending', 'active', 'revoked');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.confirmation_status as enum ('pending', 'confirmed', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_currency_check check (char_length(currency) = 3)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null default '#10b981',
  icon text,
  type public.category_type not null default 'both',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_check check (char_length(trim(name)) between 1 and 80),
  constraint categories_slug_check check (slug ~ '^[a-z0-9-]+$'),
  constraint categories_user_slug_unique unique (user_id, slug)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null,
  amount_cents bigint not null,
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  payment_method public.payment_method not null default 'cash',
  transaction_date date not null default current_date,
  source public.record_source not null default 'web',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_amount_positive check (amount_cents > 0),
  constraint transactions_description_check check (char_length(trim(description)) between 1 and 180)
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_cents bigint not null,
  due_date date not null,
  status public.bill_status not null default 'pending',
  recurrence public.recurrence_frequency not null default 'none',
  category_id uuid references public.categories(id) on delete set null,
  paid_transaction_id uuid references public.transactions(id) on delete set null,
  source public.record_source not null default 'web',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bills_amount_positive check (amount_cents > 0),
  constraint bills_name_check check (char_length(trim(name)) between 1 and 120)
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  closing_day smallint not null,
  due_day smallint not null,
  limit_cents bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_cards_name_check check (char_length(trim(name)) between 1 and 80),
  constraint credit_cards_closing_day_check check (closing_day between 1 and 31),
  constraint credit_cards_due_day_check check (due_day between 1 and 31),
  constraint credit_cards_limit_positive check (limit_cents is null or limit_cents > 0)
);

create table if not exists public.credit_card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  total_amount_cents bigint not null,
  purchase_date date not null default current_date,
  installments_count integer not null default 1,
  source public.record_source not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_card_purchases_amount_positive check (total_amount_cents > 0),
  constraint credit_card_purchases_installments_check check (installments_count between 1 and 72),
  constraint credit_card_purchases_description_check check (char_length(trim(description)) between 1 and 180)
);

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.credit_card_purchases(id) on delete cascade,
  installment_number integer not null,
  amount_cents bigint not null,
  due_date date not null,
  status public.bill_status not null default 'pending',
  paid_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint installments_amount_positive check (amount_cents > 0),
  constraint installments_number_positive check (installment_number > 0),
  constraint installments_purchase_number_unique unique (purchase_id, installment_number)
);

create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_user_id bigint not null,
  telegram_chat_id bigint,
  telegram_username text,
  status public.telegram_link_status not null default 'pending',
  link_token_hash text,
  linked_at timestamptz,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bot_pending_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_link_id uuid not null references public.telegram_links(id) on delete cascade,
  raw_message text not null,
  parsed_payload jsonb not null,
  status public.confirmation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_pending_confirmations_payload_object check (jsonb_typeof(parsed_payload) = 'object')
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_enabled boolean not null default true,
  bill_due_tomorrow boolean not null default true,
  bill_due_today boolean not null default true,
  bill_overdue boolean not null default true,
  card_due_soon boolean not null default true,
  weekly_report boolean not null default true,
  monthly_report boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_user_type_idx on public.transactions(user_id, type);
create index if not exists bills_user_due_status_idx on public.bills(user_id, due_date, status);
create index if not exists credit_cards_user_id_idx on public.credit_cards(user_id);
create index if not exists credit_card_purchases_user_card_idx on public.credit_card_purchases(user_id, credit_card_id);
create index if not exists installments_user_due_status_idx on public.installments(user_id, due_date, status);
create index if not exists telegram_links_user_status_idx on public.telegram_links(user_id, status);
create unique index if not exists telegram_links_active_user_unique
  on public.telegram_links(user_id)
  where status = 'active';
create unique index if not exists telegram_links_active_telegram_user_unique
  on public.telegram_links(telegram_user_id)
  where status = 'active';
create index if not exists bot_pending_confirmations_user_status_idx
  on public.bot_pending_confirmations(user_id, status, expires_at);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
before update on public.bills
for each row execute function public.set_updated_at();

drop trigger if exists credit_cards_set_updated_at on public.credit_cards;
create trigger credit_cards_set_updated_at
before update on public.credit_cards
for each row execute function public.set_updated_at();

drop trigger if exists credit_card_purchases_set_updated_at on public.credit_card_purchases;
create trigger credit_card_purchases_set_updated_at
before update on public.credit_card_purchases
for each row execute function public.set_updated_at();

drop trigger if exists installments_set_updated_at on public.installments;
create trigger installments_set_updated_at
before update on public.installments
for each row execute function public.set_updated_at();

drop trigger if exists telegram_links_set_updated_at on public.telegram_links;
create trigger telegram_links_set_updated_at
before update on public.telegram_links
for each row execute function public.set_updated_at();

drop trigger if exists bot_pending_confirmations_set_updated_at on public.bot_pending_confirmations;
create trigger bot_pending_confirmations_set_updated_at
before update on public.bot_pending_confirmations
for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, slug, color, icon, type, is_default)
  values
    (new.id, 'Salario', 'salario', '#10b981', 'wallet', 'income', true),
    (new.id, 'Freela', 'freela', '#14b8a6', 'briefcase', 'income', true),
    (new.id, 'Alimentacao', 'alimentacao', '#f97316', 'utensils', 'expense', true),
    (new.id, 'Mercado', 'mercado', '#84cc16', 'shopping-cart', 'expense', true),
    (new.id, 'Moradia', 'moradia', '#0ea5e9', 'home', 'expense', true),
    (new.id, 'Transporte', 'transporte', '#6366f1', 'car', 'expense', true),
    (new.id, 'Saude', 'saude', '#ef4444', 'heart-pulse', 'expense', true),
    (new.id, 'Lazer', 'lazer', '#a855f7', 'sparkles', 'expense', true),
    (new.id, 'Outros', 'outros', '#64748b', 'circle', 'both', true)
  on conflict (user_id, slug) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.bills enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_purchases enable row level security;
alter table public.installments enable row level security;
alter table public.telegram_links enable row level security;
alter table public.bot_pending_confirmations enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Categories are owned by user" on public.categories;
create policy "Categories are owned by user"
on public.categories for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Transactions are owned by user" on public.transactions;
create policy "Transactions are owned by user"
on public.transactions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Bills are owned by user" on public.bills;
create policy "Bills are owned by user"
on public.bills for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Credit cards are owned by user" on public.credit_cards;
create policy "Credit cards are owned by user"
on public.credit_cards for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Credit card purchases are owned by user" on public.credit_card_purchases;
create policy "Credit card purchases are owned by user"
on public.credit_card_purchases for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Installments are owned by user" on public.installments;
create policy "Installments are owned by user"
on public.installments for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Telegram links are owned by user" on public.telegram_links;
create policy "Telegram links are owned by user"
on public.telegram_links for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Bot confirmations are owned by user" on public.bot_pending_confirmations;
create policy "Bot confirmations are owned by user"
on public.bot_pending_confirmations for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Notification preferences are owned by user" on public.notification_preferences;
create policy "Notification preferences are owned by user"
on public.notification_preferences for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
