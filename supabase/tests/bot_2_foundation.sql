begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','31000000-0000-0000-0000-000000000001','authenticated','authenticated','bot-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','32000000-0000-0000-0000-000000000002','authenticated','authenticated','bot-b@example.test','',now(),'{}','{}',now(),now());

insert into public.telegram_links (id,user_id,telegram_user_id,telegram_chat_id,status,linked_at)
values ('33000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001',31001,31001,'active',now());
insert into public.telegram_links (id,user_id,telegram_user_id,status,link_token_hash,link_token_expires_at)
values ('33000000-0000-0000-0000-000000000002','32000000-0000-0000-0000-000000000002',null,'pending',repeat('a',64),now()+interval '10 minutes'),
('33000000-0000-0000-0000-000000000003','32000000-0000-0000-0000-000000000002',null,'pending',repeat('b',64),now()-interval '1 minute');

insert into public.bot_pending_confirmations (id,user_id,telegram_link_id,raw_message,parsed_payload,status)
values ('34000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','gastei 35 no pix',
'{"kind":"transaction","type":"expense","amount_cents":3500,"description":"Almoço","category_id":null,"payment_method":"pix","transaction_date":"2026-09-05"}'::jsonb,'pending');

set local role service_role;
select extensions.is((public.confirm_bot_transaction('34000000-0000-0000-0000-000000000001',31001)->>'ok')::boolean,true,'service role confirms transaction');
select extensions.is((public.confirm_bot_transaction('34000000-0000-0000-0000-000000000001',31001)->>'already_confirmed')::boolean,true,'confirmation retry is idempotent');
select extensions.is((select count(*)::integer from public.transactions where user_id='31000000-0000-0000-0000-000000000001' and source='telegram'),1,'only one transaction is created');
select extensions.ok((select confirmed_transaction_id is not null from public.bot_pending_confirmations where id='34000000-0000-0000-0000-000000000001'),'confirmation stores transaction FK');
select extensions.is(public.get_bot_current_balance(31001),-3500::bigint,'bot balance uses opening balance plus realized ledger');

reset role;
insert into public.bot_pending_confirmations (id,user_id,telegram_link_id,raw_message,parsed_payload,status)
select '34000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000001','forged category',
  jsonb_build_object('kind','transaction','type','expense','amount_cents',100,'description','Forged','category_id',id,
    'payment_method','pix','transaction_date','2026-09-05'),'pending'
from public.categories where user_id='32000000-0000-0000-0000-000000000002' limit 1;
set local role service_role;
select extensions.is(public.confirm_bot_transaction('34000000-0000-0000-0000-000000000002',31001)->>'code','category_not_owned','foreign category is rejected');
select extensions.is(public.confirm_bot_transaction('34000000-0000-0000-0000-000000000002',99999)->>'code','active_link_not_found','forged Telegram identity is rejected');

select extensions.is((public.activate_telegram_link(repeat('a',64),32001,32001,'tester')->>'ok')::boolean,true,'link token activates atomically');
select extensions.is(public.activate_telegram_link(repeat('a',64),32001,32001,'tester')->>'code','invalid_or_expired_token','consumed token cannot replay');
select extensions.is(public.activate_telegram_link(repeat('b',64),32002,32002,'tester')->>'code','invalid_or_expired_token','expired token is rejected');

select extensions.is(public.acquire_process_lease('telegram_polling','35000000-0000-0000-0000-000000000001',60,'{}'),true,'first polling lease wins');
select extensions.is(public.acquire_process_lease('telegram_polling','35000000-0000-0000-0000-000000000002',60,'{}'),false,'second polling lease loses');
select extensions.is(public.heartbeat_process_lease('telegram_polling','35000000-0000-0000-0000-000000000002',60),false,'wrong owner cannot heartbeat');
select extensions.is(public.release_process_lease('telegram_polling','35000000-0000-0000-0000-000000000002'),false,'wrong owner cannot release');
update public.process_leases set heartbeat_at=now()-interval '2 seconds', expires_at=now()-interval '1 second' where lease_key='telegram_polling';
select extensions.is(public.acquire_process_lease('telegram_polling','35000000-0000-0000-0000-000000000002',60,'{}'),true,'expired lease can be taken over');

select extensions.is((public.reserve_notification_delivery('32000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','bill_due_today','bill:2026-09-05','35000000-0000-0000-0000-000000000002',60,3)->>'claimed')::boolean,true,'first notification reservation wins');
select extensions.is(public.reserve_notification_delivery('32000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','bill_due_today','bill:2026-09-05','35000000-0000-0000-0000-000000000001',60,3)->>'code','already_reserved','second reservation loses');

reset role;
select extensions.is(has_function_privilege('anon','public.confirm_bot_transaction(uuid,bigint)','EXECUTE'),false,'anon cannot confirm');
select extensions.is(has_function_privilege('authenticated','public.confirm_bot_transaction(uuid,bigint)','EXECUTE'),false,'authenticated cannot confirm');
select extensions.is(has_function_privilege('service_role','public.confirm_bot_transaction(uuid,bigint)','EXECUTE'),true,'service role can confirm');
select extensions.is(has_function_privilege('anon','public.activate_telegram_link(text,bigint,bigint,text)','EXECUTE'),false,'anon cannot activate links');
select extensions.is(has_function_privilege('authenticated','public.acquire_process_lease(text,uuid,integer,jsonb)','EXECUTE'),false,'authenticated cannot acquire leases');
select extensions.is(has_function_privilege('authenticated','public.reserve_notification_delivery(uuid,uuid,text,text,uuid,integer,integer,text,uuid)','EXECUTE'),false,'authenticated cannot reserve notifications');
select extensions.is(has_function_privilege('anon','public.get_bot_current_balance(bigint)','EXECUTE'),false,'anon cannot query bot balance');
select extensions.is(has_function_privilege('authenticated','public.get_bot_current_balance(bigint)','EXECUTE'),false,'authenticated cannot query bot balance');

select * from extensions.finish();
rollback;
