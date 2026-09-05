alter table public.bills
add column if not exists type public.transaction_type,
add column if not exists recurrence_series_id uuid,
add column if not exists parent_bill_id uuid references public.bills(id) on delete set null,
add column if not exists recurrence_anchor_date date;

create unique index if not exists bills_parent_bill_unique
on public.bills(parent_bill_id)
where parent_bill_id is not null;

alter table public.profiles
add column if not exists opening_balance_cents bigint not null default 0;

create table if not exists public.invoice_payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  invoice_month date not null,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  calculated_amount_cents bigint not null,
  actual_paid_amount_cents bigint not null,
  difference_cents bigint generated always as (
    actual_paid_amount_cents - calculated_amount_cents
  ) stored,
  mode text not null default 'reconciliation',
  created_at timestamptz not null default now(),
  constraint invoice_reconciliation_month_start_check
    check (invoice_month = date_trunc('month', invoice_month)::date),
  constraint invoice_reconciliation_calculated_positive_check
    check (calculated_amount_cents > 0),
  constraint invoice_reconciliation_actual_positive_check
    check (actual_paid_amount_cents > 0),
  constraint invoice_reconciliation_mode_check
    check (mode = 'reconciliation'),
  constraint invoice_reconciliation_amounts_differ_check
    check (actual_paid_amount_cents <> calculated_amount_cents)
);

create index if not exists invoice_reconciliations_user_month_idx
on public.invoice_payment_reconciliations(user_id, invoice_month desc);

alter table public.invoice_payment_reconciliations enable row level security;

drop policy if exists "Invoice reconciliations are readable by owner"
on public.invoice_payment_reconciliations;
create policy "Invoice reconciliations are readable by owner"
on public.invoice_payment_reconciliations for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.invoice_payment_reconciliations from anon, authenticated;
grant select on public.invoice_payment_reconciliations to authenticated;

create or replace function public.require_bill_type_on_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.type is null then
    raise exception 'bill_type_required';
  end if;

  if tg_op = 'UPDATE' and old.type is not null and new.type is null then
    raise exception 'bill_type_cannot_be_cleared';
  end if;

  if tg_op = 'UPDATE' and old.status = 'paid' and new.type is distinct from old.type then
    raise exception 'paid_bill_type_is_immutable';
  end if;

  if new.recurrence <> 'none' and new.recurrence_anchor_date is null then
    new.recurrence_anchor_date := new.due_date;
  end if;

  if new.recurrence <> 'none' and new.recurrence_series_id is null then
    new.recurrence_series_id := new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists bills_require_type_on_insert on public.bills;
create trigger bills_require_type_on_insert
before insert or update of type on public.bills
for each row execute function public.require_bill_type_on_insert();

create or replace function public.next_bill_due_date(
  p_current_due_date date,
  p_recurrence public.recurrence_frequency,
  p_anchor_date date
)
returns date
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  v_anchor date := coalesce(p_anchor_date, p_current_due_date);
  v_target_month date;
  v_target_year integer;
  v_target_month_number integer;
  v_last_day integer;
begin
  case p_recurrence
    when 'daily' then
      return p_current_due_date + 1;
    when 'weekly' then
      return p_current_due_date + 7;
    when 'monthly' then
      v_target_month := (date_trunc('month', p_current_due_date) + interval '1 month')::date;
      v_last_day := extract(day from (v_target_month + interval '1 month - 1 day'))::integer;
      return make_date(
        extract(year from v_target_month)::integer,
        extract(month from v_target_month)::integer,
        least(extract(day from v_anchor)::integer, v_last_day)
      );
    when 'yearly' then
      v_target_year := extract(year from p_current_due_date)::integer + 1;
      v_target_month_number := extract(month from v_anchor)::integer;
      v_target_month := make_date(v_target_year, v_target_month_number, 1);
      v_last_day := extract(day from (v_target_month + interval '1 month - 1 day'))::integer;
      return make_date(
        v_target_year,
        v_target_month_number,
        least(extract(day from v_anchor)::integer, v_last_day)
      );
    else
      raise exception 'bill_is_not_recurring';
  end case;
end;
$$;

create or replace function public.ensure_financial_relationship_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'bills' then
    if new.parent_bill_id is not null and not exists (
      select 1 from public.bills
      where id = new.parent_bill_id and user_id = new.user_id
    ) then
      raise exception 'parent_bill_not_owned';
    end if;
    if new.paid_transaction_id is not null and not exists (
      select 1 from public.transactions
      where id = new.paid_transaction_id and user_id = new.user_id
    ) then
      raise exception 'paid_transaction_not_owned';
    end if;
  elsif tg_table_name = 'credit_card_purchases' then
    if not exists (
      select 1 from public.credit_cards
      where id = new.credit_card_id and user_id = new.user_id
    ) then
      raise exception 'credit_card_not_owned';
    end if;
    if new.source_invoice_transaction_id is not null and not exists (
      select 1 from public.transactions
      where id = new.source_invoice_transaction_id and user_id = new.user_id
    ) then
      raise exception 'source_transaction_not_owned';
    end if;
  elsif tg_table_name = 'installments' then
    if not exists (
      select 1 from public.credit_card_purchases
      where id = new.purchase_id and user_id = new.user_id
    ) then
      raise exception 'purchase_not_owned';
    end if;
    if new.paid_transaction_id is not null and not exists (
      select 1 from public.transactions
      where id = new.paid_transaction_id and user_id = new.user_id
    ) then
      raise exception 'paid_transaction_not_owned';
    end if;
  elsif tg_table_name in ('bot_pending_confirmations', 'notification_logs') then
    if new.telegram_link_id is not null and not exists (
      select 1 from public.telegram_links
      where id = new.telegram_link_id and user_id = new.user_id
    ) then
      raise exception 'telegram_link_not_owned';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bills_financial_relationship_owner on public.bills;
create trigger bills_financial_relationship_owner
before insert or update of user_id, parent_bill_id, paid_transaction_id on public.bills
for each row execute function public.ensure_financial_relationship_ownership();

drop trigger if exists purchases_financial_relationship_owner on public.credit_card_purchases;
create trigger purchases_financial_relationship_owner
before insert or update of user_id, credit_card_id, source_invoice_transaction_id
on public.credit_card_purchases
for each row execute function public.ensure_financial_relationship_ownership();

drop trigger if exists installments_financial_relationship_owner on public.installments;
create trigger installments_financial_relationship_owner
before insert or update of user_id, purchase_id, paid_transaction_id on public.installments
for each row execute function public.ensure_financial_relationship_ownership();

drop trigger if exists bot_confirmations_relationship_owner
on public.bot_pending_confirmations;
create trigger bot_confirmations_relationship_owner
before insert or update of user_id, telegram_link_id
on public.bot_pending_confirmations
for each row execute function public.ensure_financial_relationship_ownership();

drop trigger if exists notification_logs_relationship_owner
on public.notification_logs;
create trigger notification_logs_relationship_owner
before insert or update of user_id, telegram_link_id on public.notification_logs
for each row execute function public.ensure_financial_relationship_ownership();

create or replace function public.protect_linked_financial_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bills where paid_transaction_id = old.id
  ) or exists (
    select 1 from public.installments where paid_transaction_id = old.id
  ) or exists (
    select 1 from public.credit_card_purchases
    where source_invoice_transaction_id = old.id
  ) then
    raise exception 'linked_financial_transaction_cannot_be_deleted';
  end if;

  return old;
end;
$$;

drop trigger if exists transactions_protect_linked_payment
on public.transactions;
create trigger transactions_protect_linked_payment
before delete on public.transactions
for each row execute function public.protect_linked_financial_transaction();

create or replace function public.pay_bill(
  p_bill_id uuid,
  p_payment_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bill public.bills%rowtype;
  v_transaction_id uuid;
  v_next_bill_id uuid;
  v_next_due_date date;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_payment_date is null then
    raise exception 'payment_date_required';
  end if;

  select * into v_bill
  from public.bills
  where id = p_bill_id and user_id = v_user_id
  for update;

  if v_bill.id is null then
    raise exception 'bill_not_found';
  end if;

  if v_bill.type is null then
    raise exception 'bill_type_required';
  end if;

  if v_bill.status = 'paid' then
    select id into v_next_bill_id
    from public.bills
    where parent_bill_id = v_bill.id and user_id = v_user_id;

    return jsonb_build_object(
      'bill_id', v_bill.id,
      'transaction_id', v_bill.paid_transaction_id,
      'next_bill_id', v_next_bill_id,
      'already_paid', true
    );
  end if;

  if v_bill.status not in ('pending', 'overdue') then
    raise exception 'bill_not_payable';
  end if;

  insert into public.transactions (
    user_id, type, amount_cents, description, category_id,
    payment_method, transaction_date, source, notes
  ) values (
    v_user_id,
    v_bill.type,
    v_bill.amount_cents,
    case when v_bill.type = 'expense'
      then 'Pagamento: ' || v_bill.name
      else 'Recebimento: ' || v_bill.name
    end,
    v_bill.category_id,
    'other',
    p_payment_date,
    'web',
    'Gerada pelo pagamento da conta ' || v_bill.id::text
  ) returning id into v_transaction_id;

  update public.bills
  set status = 'paid', paid_transaction_id = v_transaction_id
  where id = v_bill.id and user_id = v_user_id;

  if v_bill.recurrence <> 'none' then
    v_next_due_date := public.next_bill_due_date(
      v_bill.due_date,
      v_bill.recurrence,
      coalesce(v_bill.recurrence_anchor_date, v_bill.due_date)
    );

    insert into public.bills (
      user_id, type, name, amount_cents, due_date, status, recurrence,
      category_id, source, notes, recurrence_series_id, parent_bill_id,
      recurrence_anchor_date
    ) values (
      v_user_id, v_bill.type, v_bill.name, v_bill.amount_cents,
      v_next_due_date, 'pending', v_bill.recurrence, v_bill.category_id,
      v_bill.source, v_bill.notes,
      coalesce(v_bill.recurrence_series_id, v_bill.id), v_bill.id,
      coalesce(v_bill.recurrence_anchor_date, v_bill.due_date)
    )
    on conflict (parent_bill_id) where parent_bill_id is not null do nothing
    returning id into v_next_bill_id;

    if v_next_bill_id is null then
      select id into v_next_bill_id
      from public.bills
      where parent_bill_id = v_bill.id and user_id = v_user_id;
    end if;
  end if;

  return jsonb_build_object(
    'bill_id', v_bill.id,
    'transaction_id', v_transaction_id,
    'next_bill_id', v_next_bill_id,
    'already_paid', false
  );
end;
$$;

create or replace function public.get_current_balance()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select profile.opening_balance_cents
    + coalesce((
      select sum(
        case
          when ledger.type = 'income' then ledger.amount_cents
          else -ledger.amount_cents
        end
      )
      from public.transactions ledger
      where ledger.user_id = profile.id
        and ledger.transaction_date <= (now() at time zone profile.timezone)::date
    ), 0)::bigint
  from public.profiles profile
  where profile.id = auth.uid();
$$;

create or replace function public.reconcile_credit_card_invoice(
  p_credit_card_id uuid,
  p_invoice_month date,
  p_actual_paid_amount_cents bigint,
  p_payment_date date,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_calculated_amount_cents bigint;
  v_transaction_id uuid;
  v_reconciliation_id uuid;
  v_category_id uuid;
  v_card_name text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_invoice_month <> date_trunc('month', p_invoice_month)::date then
    raise exception 'invalid_invoice_month';
  end if;
  if p_actual_paid_amount_cents <= 0 then
    raise exception 'invalid_actual_amount';
  end if;
  if p_payment_method not in ('pix', 'debit_card', 'boleto', 'bank_transfer', 'cash', 'other') then
    raise exception 'unsupported_reconciliation_payment_method';
  end if;

  select name into v_card_name
  from public.credit_cards
  where id = p_credit_card_id and user_id = v_user_id and is_active = true;

  if v_card_name is null then
    raise exception 'card_not_found';
  end if;

  perform installment.id
  from public.installments installment
  join public.credit_card_purchases purchase on purchase.id = installment.purchase_id
  where installment.user_id = v_user_id
    and purchase.user_id = v_user_id
    and purchase.credit_card_id = p_credit_card_id
    and installment.due_date >= p_invoice_month
    and installment.due_date < (p_invoice_month + interval '1 month')::date
    and installment.status in ('pending', 'overdue')
  for update of installment;

  select coalesce(sum(installment.amount_cents), 0)::bigint
  into v_calculated_amount_cents
  from public.installments installment
  join public.credit_card_purchases purchase on purchase.id = installment.purchase_id
  where installment.user_id = v_user_id
    and purchase.user_id = v_user_id
    and purchase.credit_card_id = p_credit_card_id
    and installment.due_date >= p_invoice_month
    and installment.due_date < (p_invoice_month + interval '1 month')::date
    and installment.status in ('pending', 'overdue');

  if v_calculated_amount_cents <= 0 then
    raise exception 'invoice_already_paid_or_empty';
  end if;
  if p_actual_paid_amount_cents = v_calculated_amount_cents then
    raise exception 'reconciliation_requires_divergence';
  end if;

  select id into v_category_id
  from public.categories
  where user_id = v_user_id and slug = 'fatura';

  if v_category_id is null then
    insert into public.categories (
      user_id, name, slug, color, icon, type, is_default
    ) values (
      v_user_id, 'Fatura', 'fatura', '#0f172a', 'credit-card', 'expense', true
    )
    on conflict (user_id, slug) do update
      set slug = excluded.slug
    returning id into v_category_id;
  end if;

  insert into public.transactions (
    user_id, type, amount_cents, description, category_id,
    payment_method, transaction_date, source, notes
  ) values (
    v_user_id,
    'expense',
    p_actual_paid_amount_cents,
    'Pagamento reconciliado fatura ' || v_card_name || ' ' || to_char(p_invoice_month, 'YYYY-MM'),
    v_category_id,
    p_payment_method,
    p_payment_date,
    'web',
    'Valor calculado: ' || v_calculated_amount_cents::text
      || ' centavos. Valor real: ' || p_actual_paid_amount_cents::text || ' centavos.'
  ) returning id into v_transaction_id;

  insert into public.invoice_payment_reconciliations (
    user_id, credit_card_id, invoice_month, transaction_id,
    calculated_amount_cents, actual_paid_amount_cents
  ) values (
    v_user_id, p_credit_card_id, p_invoice_month, v_transaction_id,
    v_calculated_amount_cents, p_actual_paid_amount_cents
  ) returning id into v_reconciliation_id;

  update public.installments installment
  set status = 'paid', paid_transaction_id = v_transaction_id
  from public.credit_card_purchases purchase
  where purchase.id = installment.purchase_id
    and installment.user_id = v_user_id
    and purchase.user_id = v_user_id
    and purchase.credit_card_id = p_credit_card_id
    and installment.due_date >= p_invoice_month
    and installment.due_date < (p_invoice_month + interval '1 month')::date
    and installment.status in ('pending', 'overdue');

  return jsonb_build_object(
    'reconciliation_id', v_reconciliation_id,
    'transaction_id', v_transaction_id,
    'calculated_amount_cents', v_calculated_amount_cents,
    'actual_paid_amount_cents', p_actual_paid_amount_cents,
    'difference_cents', p_actual_paid_amount_cents - v_calculated_amount_cents
  );
end;
$$;

revoke all on function public.reconcile_credit_card_invoice(
  uuid, date, bigint, date, public.payment_method
) from public, anon;
grant execute on function public.reconcile_credit_card_invoice(
  uuid, date, bigint, date, public.payment_method
) to authenticated;

grant execute on function public.pay_bill(uuid, date) to authenticated;
grant execute on function public.get_current_balance() to authenticated;
grant execute on function public.next_bill_due_date(
  date, public.recurrence_frequency, date
) to authenticated;

revoke all on function public.pay_bill(uuid, date) from public, anon;
revoke all on function public.get_current_balance() from public, anon;
revoke all on function public.ensure_financial_relationship_ownership()
from public, anon, authenticated;
revoke all on function public.protect_linked_financial_transaction()
from public, anon, authenticated;
