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
  v_candidate_month date;
  v_installment_number integer;
  v_due_date date;
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
  v_candidate_month := v_first_due_month;

  for v_installment_number in 1..p_installments_count loop
    while exists (
      select 1
      from public.installments installment
      join public.credit_card_purchases purchase
        on purchase.id = installment.purchase_id
      where installment.user_id = v_user_id
        and purchase.credit_card_id = p_credit_card_id
        and installment.due_date >= v_candidate_month
        and installment.due_date < (v_candidate_month + interval '1 month')::date
        and installment.status = 'paid'
    ) and not exists (
      select 1
      from public.installments installment
      join public.credit_card_purchases purchase
        on purchase.id = installment.purchase_id
      where installment.user_id = v_user_id
        and purchase.credit_card_id = p_credit_card_id
        and installment.due_date >= v_candidate_month
        and installment.due_date < (v_candidate_month + interval '1 month')::date
        and installment.status in ('pending', 'overdue', 'cancelled')
    ) loop
      v_candidate_month := (v_candidate_month + interval '1 month')::date;
    end loop;

    v_due_date := (
      v_candidate_month
      + (
        least(
          v_card.due_day,
          extract(day from (v_candidate_month + interval '1 month' - interval '1 day'))::integer
        ) - 1
      ) * interval '1 day'
    )::date;

    insert into public.installments (
      user_id,
      purchase_id,
      installment_number,
      amount_cents,
      due_date,
      status
    )
    values (
      v_user_id,
      v_purchase_id,
      v_installment_number,
      v_base_amount + case when v_installment_number <= v_remainder then 1 else 0 end,
      v_due_date,
      'pending'
    );

    v_candidate_month := (v_candidate_month + interval '1 month')::date;
  end loop;

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

create or replace function public.move_installment_to_adjacent_invoice(
  p_installment_id uuid,
  p_direction text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_installment record;
  v_current_month date;
  v_target_month date;
  v_target_due_date date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_direction not in ('previous', 'next') then
    raise exception 'invalid_direction';
  end if;

  select
    installment.id,
    installment.due_date,
    installment.status,
    purchase.credit_card_id,
    card.due_day
    into v_installment
  from public.installments installment
  join public.credit_card_purchases purchase
    on purchase.id = installment.purchase_id
  join public.credit_cards card
    on card.id = purchase.credit_card_id
  where installment.id = p_installment_id
    and installment.user_id = v_user_id
    and purchase.user_id = v_user_id
    and card.user_id = v_user_id;

  if v_installment.id is null then
    raise exception 'installment_not_found';
  end if;

  if v_installment.status not in ('pending', 'overdue') then
    raise exception 'installment_not_open';
  end if;

  v_current_month := date_trunc('month', v_installment.due_date)::date;
  v_target_month := case
    when p_direction = 'previous'
      then (v_current_month - interval '1 month')::date
    else (v_current_month + interval '1 month')::date
  end;

  if exists (
    select 1
    from public.installments installment
    join public.credit_card_purchases purchase
      on purchase.id = installment.purchase_id
    where installment.user_id = v_user_id
      and purchase.credit_card_id = v_installment.credit_card_id
      and installment.due_date >= v_target_month
      and installment.due_date < (v_target_month + interval '1 month')::date
      and installment.status = 'paid'
  ) and not exists (
    select 1
    from public.installments installment
    join public.credit_card_purchases purchase
      on purchase.id = installment.purchase_id
    where installment.user_id = v_user_id
      and purchase.credit_card_id = v_installment.credit_card_id
      and installment.due_date >= v_target_month
      and installment.due_date < (v_target_month + interval '1 month')::date
      and installment.status in ('pending', 'overdue', 'cancelled')
  ) then
    raise exception 'target_invoice_already_paid';
  end if;

  v_target_due_date := (
    v_target_month
    + (
      least(
        v_installment.due_day,
        extract(day from (v_target_month + interval '1 month' - interval '1 day'))::integer
      ) - 1
    ) * interval '1 day'
  )::date;

  update public.installments
  set
    due_date = v_target_due_date,
    status = case
      when v_target_due_date < v_today then 'overdue'::public.bill_status
      else 'pending'::public.bill_status
    end,
    paid_transaction_id = null
  where id = p_installment_id
    and user_id = v_user_id;
end;
$$;

grant execute on function public.move_installment_to_adjacent_invoice(
  uuid,
  text
) to authenticated;
