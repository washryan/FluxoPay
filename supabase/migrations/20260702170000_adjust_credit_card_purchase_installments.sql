create or replace function public.adjust_credit_card_purchase_installments(
  p_purchase_id uuid,
  p_installments_count integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase record;
  v_updated_total_cents bigint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_installments_count < 1 or p_installments_count > 72 then
    raise exception 'invalid_installments_count';
  end if;

  select id, installments_count, source_invoice_transaction_id
    into v_purchase
  from public.credit_card_purchases
  where id = p_purchase_id
    and user_id = v_user_id;

  if v_purchase.id is null then
    raise exception 'purchase_not_found';
  end if;

  if v_purchase.source_invoice_transaction_id is not null then
    raise exception 'source_invoice_purchase';
  end if;

  if p_installments_count >= v_purchase.installments_count then
    raise exception 'new_count_must_be_lower';
  end if;

  if exists (
    select 1
    from public.installments
    where purchase_id = p_purchase_id
      and user_id = v_user_id
      and installment_number > p_installments_count
      and (status = 'paid' or paid_transaction_id is not null)
  ) then
    raise exception 'paid_removed_installment';
  end if;

  select coalesce(sum(amount_cents), 0)
    into v_updated_total_cents
  from public.installments
  where purchase_id = p_purchase_id
    and user_id = v_user_id
    and installment_number <= p_installments_count;

  if v_updated_total_cents <= 0 then
    raise exception 'invalid_remaining_installments';
  end if;

  delete from public.installments
  where purchase_id = p_purchase_id
    and user_id = v_user_id
    and installment_number > p_installments_count;

  update public.credit_card_purchases
  set
    installments_count = p_installments_count,
    total_amount_cents = v_updated_total_cents
  where id = p_purchase_id
    and user_id = v_user_id;
end;
$$;

grant execute on function public.adjust_credit_card_purchase_installments(
  uuid,
  integer
) to authenticated;
