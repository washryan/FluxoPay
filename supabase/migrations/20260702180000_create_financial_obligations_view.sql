drop view if exists public.financial_obligations;

create or replace view public.financial_obligations
with (security_invoker = true)
as
select
  bill.id,
  bill.id as reference_id,
  bill.user_id,
  'bill'::text as obligation_type,
  'bills'::text as reference_table,
  bill.name as title,
  bill.amount_cents,
  bill.due_date,
  bill.status::text as status,
  bill.category_id,
  category.name as category_name,
  category.color as category_color,
  null::uuid as credit_card_id,
  null::text as card_name,
  null::uuid as purchase_id,
  null::integer as installment_number,
  null::integer as installments_count,
  bill.created_at
from public.bills bill
left join public.categories category on category.id = bill.category_id
where bill.status in ('pending', 'overdue')

union all

select
  installment.id,
  installment.id as reference_id,
  installment.user_id,
  'credit_card_installment'::text as obligation_type,
  'installments'::text as reference_table,
  purchase.description as title,
  installment.amount_cents,
  installment.due_date,
  installment.status::text as status,
  purchase.category_id,
  category.name as category_name,
  category.color as category_color,
  card.id as credit_card_id,
  card.name as card_name,
  purchase.id as purchase_id,
  installment.installment_number,
  purchase.installments_count,
  installment.created_at
from public.installments installment
inner join public.credit_card_purchases purchase
  on purchase.id = installment.purchase_id
inner join public.credit_cards card
  on card.id = purchase.credit_card_id
left join public.categories category
  on category.id = purchase.category_id
where installment.status in ('pending', 'overdue');

grant select on public.financial_obligations to authenticated;
grant select on public.financial_obligations to service_role;
