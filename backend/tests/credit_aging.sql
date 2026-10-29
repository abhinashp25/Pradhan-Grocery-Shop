-- Tests: age of unpaid credit, the reminder setting, and the locked helper functions.
-- Run on the TEST Supabase project after migrations 001 to 009. Rolls back at the end.
-- The last result must say ALL PASSED.

begin;

create function public.t_check(ok boolean, test_name text) returns text language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', test_name; end if;
  return 'PASS: ' || test_name;
end $$;
create function public.t_fails(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;
create function public.t_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true);
$$;
create function public.t_today() returns date language sql as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 'one@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c2', 'two@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'three@test.invalid');
insert into profiles (id, role, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin', 'Test Owner', null),
  ('00000000-0000-0000-0000-0000000000c1', 'customer', 'Test One', '9000000001'),
  ('00000000-0000-0000-0000-0000000000c2', 'customer', 'Test Two', '9000000002'),
  ('00000000-0000-0000-0000-0000000000c3', 'customer', 'Test Three', '9000000003');
insert into credit_accounts (id, customer_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c3');

select t_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;

-- Customer one: 1000 taken 45 days ago, 500 taken 10 days ago, 1000 paid 5 days ago.
select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'credit', 100000, 'a', t_today() - 45);
select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'credit', 50000, 'b', t_today() - 10);
select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'payment', 100000, 'c', t_today() - 5);
select t_check((select days_pending from credit_aging() where account_id = '00000000-0000-0000-0000-0000000000b1') = 10, 'payments are counted against the oldest credit first (age is 10 days)');
select t_check((select pending_paise from credit_aging() where account_id = '00000000-0000-0000-0000-0000000000b1') = 50000, 'pending is 500 rupees');
select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'payment', 20000, 'd', t_today());
select t_check((select days_pending from credit_aging() where account_id = '00000000-0000-0000-0000-0000000000b1') = 10, 'a part payment of the newer credit does not change the age');

-- Customer two: 300 taken 40 days ago and nothing paid.
select add_credit_entry('00000000-0000-0000-0000-0000000000b2', 'credit', 30000, 'e', t_today() - 40);
select t_check((select days_pending from credit_aging() where account_id = '00000000-0000-0000-0000-0000000000b2') = 40, 'an unpaid credit shows its full age');

-- Customer three: paid in full means no age at all.
select add_credit_entry('00000000-0000-0000-0000-0000000000b3', 'credit', 10000, 'f', t_today() - 60);
select mark_all_cleared('00000000-0000-0000-0000-0000000000b3');
select t_check((select days_pending from credit_aging() where account_id = '00000000-0000-0000-0000-0000000000b3') is null, 'a cleared account has no age');

-- A customer who paid extra (advance) has no age either.
select t_check((select count(*) from credit_aging()) = 3, 'the owner sees every account');
select t_check((select credit_reminder_days from shop_settings where id = 1) = 30, 'the reminder is 30 days by default');
select t_check(not t_fails($$update shop_settings set credit_reminder_days = 15 where id = 1$$), 'the owner can change the reminder days');
select t_check(t_fails($$update shop_settings set credit_reminder_days = 0 where id = 1$$), 'reminder days of zero are refused');
select t_check(t_fails($$select credit_pending('00000000-0000-0000-0000-0000000000b1')$$), 'nobody can call the internal balance helper directly');
select t_check(t_fails($$select credit_oldest_unpaid('00000000-0000-0000-0000-0000000000b1')$$), 'nobody can call the internal age helper directly');
select t_check(t_fails($$select write_audit('x', 'y', 'z', null)$$), 'nobody can write to the activity log directly');
select t_check((select count(*) from audit_log where action = 'credit_entry') >= 6, 'the activity log still fills from the credit functions');

-- A customer sees only their own age.
select t_as('00000000-0000-0000-0000-0000000000c2');
select t_check((select days_pending from get_my_credit_age()) = 40, 'customer sees the age of their own unpaid credit');
select t_check((select count(*) from credit_aging()) = 0, 'customer cannot use the owner age list');
select t_check(t_fails($$select credit_pending('00000000-0000-0000-0000-0000000000b1')$$), 'customer cannot call the balance helper');
select t_check(t_fails($$select write_audit('fake', 'fake', 'fake', null)$$), 'customer cannot write a fake activity log line');

-- A hidden balance hides the age too.
select t_as('00000000-0000-0000-0000-0000000000a1');
update credit_accounts set show_balance = false where id = '00000000-0000-0000-0000-0000000000b2';
select t_as('00000000-0000-0000-0000-0000000000c2');
select t_check((select count(*) from get_my_credit_age()) = 0, 'a hidden balance returns no age');

-- A visitor gets nothing.
reset role;
select t_as('');
set local role anon;
select t_check(t_fails($$select * from credit_aging()$$), 'visitor cannot read the age list');
select t_check(t_fails($$select * from get_my_credit_age()$$), 'visitor cannot ask for an age');

reset role;
select 'ALL PASSED' as result;
rollback;
