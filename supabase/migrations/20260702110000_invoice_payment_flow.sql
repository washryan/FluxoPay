alter type public.payment_method add value if not exists 'boleto';

alter table public.credit_card_purchases
add column if not exists skip_transaction_on_payment boolean not null default false;

drop function if exists public.create_credit_card_purchase_with_installments(
  uuid,
  uuid,
  text,
  bigint,
  date,
  integer
);

create or replace function public.create_credit_card_purchase_with_installments(
  p_credit_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_total_amount_cents bigint,
  p_purchase_date date,
  p_installments_count integer,
  p_skip_transaction_on_payment boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_card record;
  v_purchase_id uuid;
  v_base_amount bigint;
  v_remainder integer;
  v_first_due_month date;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_total_amount_cents <= 0 then
    raise exception 'invalid_amount';
  end if;

  if p_installments_count < 1 or p_installments_count > 72 then
    raise exception 'invalid_installments_count';
  end if;

  select id, closing_day, due_day
    into v_card
  from public.credit_cards
  where id = p_credit_card_id
    and user_id = v_user_id
    and is_active = true;

  if v_card.id is null then
    raise exception 'card_not_found';
  end if;

  if p_category_id is not null and not exists (
    select 1
    from public.categories
    where id = p_category_id
      and user_id = v_user_id
      and type in ('expense', 'both')
  ) then
    raise exception 'category_not_found';
  end if;

  insert into public.credit_card_purchases (
    user_id,
    credit_card_id,
    category_id,
    description,
    total_amount_cents,
    purchase_date,
    installments_count,
    source,
    skip_transaction_on_payment
  )
  values (
    v_user_id,
    p_credit_card_id,
    p_category_id,
    p_description,
    p_total_amount_cents,
    p_purchase_date,
    p_installments_count,
    'web',
    p_skip_transaction_on_payment
  )
  returning id into v_purchase_id;

  v_base_amount := p_total_amount_cents / p_installments_count;
  v_remainder := p_total_amount_cents % p_installments_count;
  v_first_due_month := (
    date_trunc('month', p_purchase_date)::date
    + case
      when extract(day from p_purchase_date)::integer > v_card.closing_day
        then interval '1 month'
      else interval '0 months'
    end
  )::date;

  insert into public.installments (
    user_id,
    purchase_id,
    installment_number,
    amount_cents,
    due_date,
    status
  )
  select
    v_user_id,
    v_purchase_id,
    installment_number,
    v_base_amount + case when installment_number <= v_remainder then 1 else 0 end,
    (
      month_start
      + (
        least(
          v_card.due_day,
          extract(day from (month_start + interval '1 month' - interval '1 day'))::integer
        ) - 1
      ) * interval '1 day'
    )::date,
    'pending'
  from (
    select
      installment_number,
      (
        v_first_due_month
        + ((installment_number - 1)::text || ' months')::interval
      )::date as month_start
    from generate_series(1, p_installments_count) as series(installment_number)
  ) due_dates;

  return v_purchase_id;
end;
$$;

grant execute on function public.create_credit_card_purchase_with_installments(
  uuid,
  uuid,
  text,
  bigint,
  date,
  integer,
  boolean
) to authenticated;
