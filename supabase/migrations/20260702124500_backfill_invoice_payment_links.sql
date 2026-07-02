with candidates as (
  select
    purchase.id as purchase_id,
    payment.id as transaction_id,
    count(*) over (partition by purchase.id) as matches_for_purchase
  from public.credit_card_purchases purchase
  join public.transactions payment
    on payment.user_id = purchase.user_id
    and payment.type = 'expense'
    and payment.payment_method = 'credit_card'
    and payment.description = purchase.description
    and payment.amount_cents = purchase.total_amount_cents
    and payment.transaction_date = purchase.purchase_date
  where purchase.skip_transaction_on_payment = true
    and purchase.source_invoice_transaction_id is null
)
update public.credit_card_purchases purchase
set source_invoice_transaction_id = candidates.transaction_id
from candidates
where purchase.id = candidates.purchase_id
  and candidates.matches_for_purchase = 1;
