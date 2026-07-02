alter table public.installments
add column if not exists partial_payment_original_amount_cents bigint;

create or replace function public.revoke_invoice_payment(p_transaction_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_restored_count integer;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.transactions
    where id = p_transaction_id
      and user_id = v_user_id
      and type = 'expense'
  ) then
    raise exception 'payment_transaction_not_found';
  end if;

  select count(*)
    into v_restored_count
  from public.installments
  where user_id = v_user_id
    and paid_transaction_id = p_transaction_id;

  if v_restored_count = 0 then
    raise exception 'paid_installments_not_found';
  end if;

  delete from public.credit_card_purchases
  where user_id = v_user_id
    and source_invoice_transaction_id = p_transaction_id;

  update public.installments
  set
    amount_cents = coalesce(partial_payment_original_amount_cents, amount_cents),
    partial_payment_original_amount_cents = null,
    status = case
      when due_date < v_today then 'overdue'::public.bill_status
      else 'pending'::public.bill_status
    end,
    paid_transaction_id = null
  where user_id = v_user_id
    and paid_transaction_id = p_transaction_id;

  delete from public.transactions
  where id = p_transaction_id
    and user_id = v_user_id;

  return v_restored_count;
end;
$$;

grant execute on function public.revoke_invoice_payment(uuid) to authenticated;
