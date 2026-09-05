begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.is(
  public.next_bill_due_date('2026-09-04', 'daily', '2026-09-04'),
  '2026-09-05'::date,
  'daily recurrence advances one calendar day'
);
select extensions.is(
  public.next_bill_due_date('2026-09-04', 'weekly', '2026-09-04'),
  '2026-09-11'::date,
  'weekly recurrence advances seven calendar days'
);
select extensions.is(
  public.next_bill_due_date('2026-09-05', 'monthly', '2026-09-05'),
  '2026-10-05'::date,
  'monthly recurrence preserves ordinary day'
);
select extensions.is(
  public.next_bill_due_date('2026-01-31', 'monthly', '2026-01-31'),
  '2026-02-28'::date,
  'monthly recurrence clamps to the last valid day'
);
select extensions.is(
  public.next_bill_due_date('2026-02-28', 'monthly', '2026-01-31'),
  '2026-03-31'::date,
  'monthly recurrence retains its original anchor after clamping'
);
select extensions.is(
  public.next_bill_due_date('2026-09-04', 'yearly', '2026-09-04'),
  '2027-09-04'::date,
  'yearly recurrence preserves month and day'
);
select extensions.is(
  public.next_bill_due_date('2024-02-29', 'yearly', '2024-02-29'),
  '2025-02-28'::date,
  'leap-day recurrence clamps in a non-leap year'
);
select extensions.is(
  public.next_bill_due_date('2027-02-28', 'yearly', '2024-02-29'),
  '2028-02-29'::date,
  'leap-day recurrence returns to February 29 in a leap year'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@example.test', '', now(), '{}', '{}', now(), now());

insert into public.categories (
  id, user_id, name, slug, type
) values (
  '24000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'Categoria privada B', 'categoria-privada-b', 'expense'
);

insert into public.bills (
  id, user_id, type, name, amount_cents, due_date, status, recurrence, source
) values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'expense', 'Internet', 10000, '2026-09-05', 'pending', 'monthly', 'web'),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'income', 'Recebimento A', 5000, '2026-09-05', 'pending', 'none', 'web'),
  ('22000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'income', 'Recebível B', 5000, '2026-09-05', 'pending', 'none', 'web');

update public.bills
set category_id = (
  select id from public.categories
  where user_id = '10000000-0000-0000-0000-000000000001'
    and type = 'expense'
  order by created_at
  limit 1
)
where id = '11000000-0000-0000-0000-000000000001';

alter table public.bills disable trigger bills_require_type_on_insert;
insert into public.bills (
  id, user_id, type, name, amount_cents, due_date, status, recurrence, source
) values (
  '11000000-0000-0000-0000-000000000099',
  '10000000-0000-0000-0000-000000000001',
  null, 'Legado sem classificação', 3000, '2026-09-06', 'pending', 'none', 'web'
);
alter table public.bills enable trigger bills_require_type_on_insert;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select extensions.throws_like(
  $$insert into public.bills (user_id, name, amount_cents, due_date) values ('10000000-0000-0000-0000-000000000001', 'Sem direção', 100, '2026-09-05')$$,
  '%bill_type_required%',
  'new bills require a financial direction'
);
select extensions.throws_like(
  $$select public.pay_bill('11000000-0000-0000-0000-000000000099', '2026-09-05')$$,
  '%bill_type_required%',
  'legacy bills must be classified before payment'
);
select extensions.throws_like(
  $$select public.pay_bill('22000000-0000-0000-0000-000000000002', '2026-09-05')$$,
  '%bill_not_found%',
  'user A cannot pay user B bill'
);
with changed as (
  update public.bills set type = 'expense'
  where id = '22000000-0000-0000-0000-000000000002'
  returning 1
)
select extensions.is(
  (select count(*)::integer from changed),
  0,
  'user A cannot classify user B bill'
);
select extensions.throws_like(
  $$insert into public.bills (user_id, type, name, amount_cents, due_date, category_id) values ('10000000-0000-0000-0000-000000000001', 'expense', 'Categoria de B', 100, '2026-09-05', '24000000-0000-0000-0000-000000000002')$$,
  '%Category does not belong to this user%',
  'user A cannot pass user B category id to a bill'
);
select extensions.throws_like(
  $$insert into public.bills (user_id, type, name, amount_cents, due_date, parent_bill_id) values ('10000000-0000-0000-0000-000000000001', 'expense', 'Parent de B', 100, '2026-10-05', '22000000-0000-0000-0000-000000000002')$$,
  '%parent_bill_not_owned%',
  'user A cannot pass user B bill as a recurrence parent'
);
select extensions.lives_ok(
  $$select public.pay_bill('11000000-0000-0000-0000-000000000001', (now() at time zone 'America/Sao_Paulo')::date)$$,
  'owner can atomically pay a recurring bill'
);
select extensions.is(
  (select status::text from public.bills where id = '11000000-0000-0000-0000-000000000001'),
  'paid',
  'paid occurrence remains in history'
);
select extensions.is(
  (select count(*)::integer from public.transactions where notes = 'Gerada pelo pagamento da conta 11000000-0000-0000-0000-000000000001'),
  1,
  'bill payment creates one ledger transaction'
);
select extensions.is(
  (select due_date from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  '2026-10-05'::date,
  'payment creates the next monthly occurrence'
);
select extensions.is(
  (select status::text from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  'pending',
  'next occurrence is pending'
);
select extensions.is(
  (select amount_cents from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  10000::bigint,
  'next occurrence preserves value'
);
select extensions.is(
  (select user_id from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'next occurrence preserves its owner'
);
select extensions.is(
  (select category_id from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  (select category_id from public.bills where id = '11000000-0000-0000-0000-000000000001'),
  'next occurrence preserves a valid category'
);
select extensions.is(
  (select recurrence_series_id from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  (select recurrence_series_id from public.bills where id = '11000000-0000-0000-0000-000000000001'),
  'next occurrence remains in the same recurrence series'
);
select extensions.lives_ok(
  $$select public.pay_bill('11000000-0000-0000-0000-000000000001', (now() at time zone 'America/Sao_Paulo')::date)$$,
  'retry is idempotent'
);
select extensions.is(
  (select count(*)::integer from public.bills where parent_bill_id = '11000000-0000-0000-0000-000000000001'),
  1,
  'retry does not duplicate the next occurrence'
);
select extensions.is(
  (select count(*)::integer from public.transactions where notes = 'Gerada pelo pagamento da conta 11000000-0000-0000-0000-000000000001'),
  1,
  'retry does not duplicate the transaction'
);
select extensions.throws_like(
  $$delete from public.transactions where notes = 'Gerada pelo pagamento da conta 11000000-0000-0000-0000-000000000001'$$,
  '%linked_financial_transaction_cannot_be_deleted%',
  'a payment transaction cannot be deleted while linked to a paid bill'
);
select extensions.lives_ok(
  $$select public.pay_bill('11000000-0000-0000-0000-000000000002', (now() at time zone 'America/Sao_Paulo')::date)$$,
  'an income bill can be received atomically'
);
select extensions.is(
  (select type::text from public.transactions where notes = 'Gerada pelo pagamento da conta 11000000-0000-0000-0000-000000000002'),
  'income',
  'receiving an income bill creates an income ledger entry'
);

reset role;
insert into public.credit_cards (id, user_id, name, closing_day, due_day)
values
  ('13000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cartão A', 25, 5),
  ('23000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Cartão B', 25, 5);
insert into public.credit_card_purchases (
  id, user_id, credit_card_id, description, total_amount_cents,
  purchase_date, installments_count
) values (
  '14000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  'Compra A', 125000, '2026-08-10', 1
);
insert into public.installments (
  id, user_id, purchase_id, installment_number, amount_cents, due_date, status
) values (
  '15000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '14000000-0000-0000-0000-000000000001',
  1, 125000, '2026-09-05', 'pending'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select extensions.throws_like(
  $$insert into public.credit_card_purchases (user_id, credit_card_id, description, total_amount_cents, installments_count) values ('10000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', 'Cross user', 100, 1)$$,
  '%credit_card_not_owned%',
  'user A cannot pass user B card id'
);
select extensions.throws_like(
  $$select public.reconcile_credit_card_invoice('23000000-0000-0000-0000-000000000002', '2026-09-01', 124300, '2026-09-05', 'pix')$$,
  '%card_not_found%',
  'user A cannot reconcile user B invoice'
);

reset role;
insert into public.telegram_links (
  id, user_id, telegram_user_id, status
) values (
  '26000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  26000002, 'active'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select extensions.throws_like(
  $$insert into public.bot_pending_confirmations (user_id, telegram_link_id, raw_message, parsed_payload) values ('10000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000002', 'Cross link', '{}')$$,
  '%telegram_link_not_owned%',
  'user A cannot pass user B telegram link id'
);

select extensions.lives_ok(
  $$select public.reconcile_credit_card_invoice('13000000-0000-0000-0000-000000000001', '2026-09-01', 124300, '2026-09-05', 'pix')$$,
  'owner can reconcile an invoice atomically'
);
select extensions.is(
  (select difference_cents from public.invoice_payment_reconciliations limit 1),
  (-700)::bigint,
  'reconciliation preserves the signed difference'
);
select extensions.is(
  (select amount_cents from public.transactions where id = (select transaction_id from public.invoice_payment_reconciliations limit 1)),
  124300::bigint,
  'ledger records the actual bank amount'
);
select extensions.is(
  (select status::text from public.installments where id = '15000000-0000-0000-0000-000000000001'),
  'paid',
  'reconciliation closes all open installments'
);
select extensions.throws_like(
  $$select public.reconcile_credit_card_invoice('13000000-0000-0000-0000-000000000001', '2026-09-01', 124300, '2026-09-05', 'pix')$$,
  '%invoice_already_paid_or_empty%',
  'reconciliation retry does not create a duplicate payment'
);
select extensions.is(
  (select count(*)::integer from public.invoice_payment_reconciliations),
  1,
  'reconciliation retry leaves exactly one audit record'
);
select extensions.lives_ok(
  $$select public.revoke_invoice_payment((select transaction_id from public.invoice_payment_reconciliations limit 1))$$,
  'reconciliation can be reversed atomically'
);
select extensions.is(
  (select status::text from public.installments where id = '15000000-0000-0000-0000-000000000001'),
  case when '2026-09-05'::date < (now() at time zone 'America/Sao_Paulo')::date then 'overdue' else 'pending' end,
  'reversal restores the correct open status'
);
select extensions.is(
  (select count(*)::integer from public.invoice_payment_reconciliations),
  0,
  'reversal removes the reconciliation through transaction cascade'
);

update public.profiles set opening_balance_cents = 150000 where id = '10000000-0000-0000-0000-000000000001';
insert into public.transactions (
  user_id, type, amount_cents, description, payment_method, transaction_date
) values
  ('10000000-0000-0000-0000-000000000001', 'income', 2000, 'Entrada teste', 'pix', (now() at time zone 'America/Sao_Paulo')::date),
  ('10000000-0000-0000-0000-000000000001', 'expense', 1000, 'Saída teste', 'pix', (now() at time zone 'America/Sao_Paulo')::date),
  ('10000000-0000-0000-0000-000000000001', 'expense', 999999, 'Futura', 'pix', (now() at time zone 'America/Sao_Paulo')::date + 1);
select extensions.is(
  public.get_current_balance(),
  146000::bigint,
  'current balance is opening balance plus realized ledger entries only'
);
update public.transactions
set amount_cents = 500
where description = 'Saída teste' and user_id = '10000000-0000-0000-0000-000000000001';
select extensions.is(
  public.get_current_balance(),
  146500::bigint,
  'editing a ledger transaction immediately changes the aggregate balance'
);
delete from public.transactions
where description = 'Entrada teste' and user_id = '10000000-0000-0000-0000-000000000001';
select extensions.is(
  public.get_current_balance(),
  144500::bigint,
  'deleting a ledger transaction immediately changes the aggregate balance'
);

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select extensions.is(
  public.get_current_balance(),
  0::bigint,
  'user B balance cannot include user A ledger or opening balance'
);
select extensions.is(
  (select count(*)::integer from public.transactions
   where user_id = '10000000-0000-0000-0000-000000000001'),
  0,
  'user B cannot read user A ledger'
);
with changed as (
  update public.profiles set opening_balance_cents = 999999
  where id = '10000000-0000-0000-0000-000000000001'
  returning 1
)
select extensions.is(
  (select count(*)::integer from changed),
  0,
  'user B cannot alter user A opening balance'
);

select * from extensions.finish();
rollback;
