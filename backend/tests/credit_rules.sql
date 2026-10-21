-- Tests for the credit book, lists and access rules (blueprint sections 9.1 and 9.2).
-- Run this on the TEST Supabase project, in the SQL editor, after 001_core.sql and 002_storage.sql.
-- It makes its own test people and rolls everything back at the end, so nothing stays.
-- If a test fails, the script stops with a message that starts with FAIL.
-- If every test passes, the last result says ALL PASSED.

begin;

create function public.t_check(ok boolean, test_name text) returns text language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', test_name; end if;
  return 'PASS: ' || test_name;
end $$;

-- True when running the statement raises an error (which is what we want for forbidden things).
create function public.t_fails(q text) returns boolean language plpgsql as $$
begin
  execute q;
  return false;
exception when others then
  return true;
end $$;

create function public.t_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true);
$$;

-- Test people: one owner and two customers.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 'one@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c2', 'two@test.invalid');
insert into profiles (id, role, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin', 'Test Owner', null),
  ('00000000-0000-0000-0000-0000000000c1', 'customer', 'Test One', '9000000001'),
  ('00000000-0000-0000-0000-0000000000c2', 'customer', 'Test Two', '9000000002');
insert into credit_accounts (id, customer_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2');
insert into products (id, category_id, name_en, name_or, search_words) values
  ('00000000-0000-0000-0000-0000000000d1', 1, 'Test Rice', 'ଚାଉଳ', 'chawal, rice'),
  ('00000000-0000-0000-0000-0000000000d2', 1, 'Test Hidden', 'ଲୁଚା', 'secret');
update products set is_hidden = true where id = '00000000-0000-0000-0000-0000000000d2';
insert into product_sizes (id, product_id, label, price_paise, is_default) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', '1 kg', 6200, true);

-- ===== The owner works the credit book =====
select t_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;

select t_check(is_admin(), 'owner is recognised as owner');
select t_check(add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'credit', 50000, 'goods', current_date) = 50000, 'credit of 500 rupees makes pending 500');
select t_check(add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'payment', 20000, 'paid', current_date) = 30000, 'payment of 200 rupees leaves 300');
select t_check(mark_all_cleared('00000000-0000-0000-0000-0000000000b1') = 0, 'mark all cleared makes pending 0');
select t_check((select status from credit_balances where account_id = '00000000-0000-0000-0000-0000000000b1') = 'cleared', 'status shows cleared');
select t_check(t_fails($$select mark_all_cleared('00000000-0000-0000-0000-0000000000b1')$$), 'mark all cleared is refused when nothing is pending');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'payment', 1000, '', current_date)$$), 'payment larger than pending needs the advance tick');
select t_check(add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'payment', 1000, 'extra', current_date, p_confirm_advance => true) = -1000, 'payment with the advance tick is accepted');
select t_check((select status from credit_balances where account_id = '00000000-0000-0000-0000-0000000000b1') = 'advance', 'status shows advance');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'credit', 100, '', (now() at time zone 'Asia/Kolkata')::date + 1)$$), 'a future date is refused');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'credit', 0, '', current_date)$$), 'amount zero is refused');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'credit', -500, '', current_date)$$), 'negative amount is refused');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'correction', 500, '', current_date, null, null, 1::smallint)$$), 'a correction without reason and old line is refused');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'correction', 500, '', current_date, 'wrong amount', (select id from credit_entries where account_id = '00000000-0000-0000-0000-0000000000b2' limit 1), 1::smallint)$$), 'a correction must point to a line of the same customer');
select t_check(add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'correction', 500, 'fix', current_date, 'typed too little', (select id from credit_entries where account_id = '00000000-0000-0000-0000-0000000000b1' order by created_at limit 1), 1::smallint) = -500, 'a correct correction is accepted');

select t_check(t_fails($$update credit_entries set amount_paise = 1$$), 'owner cannot edit a credit line');
select t_check(t_fails($$delete from credit_entries$$), 'owner cannot delete a credit line');
select t_check(t_fails($$truncate credit_entries$$), 'owner cannot empty the credit table');
select t_check(t_fails($$insert into credit_entries (account_id, entry_type, effect, amount_paise, entry_date, created_by) values ('00000000-0000-0000-0000-0000000000b1', 'credit', 1, 100, current_date, '00000000-0000-0000-0000-0000000000a1')$$), 'lines cannot be added except through the functions');
select t_check((select count(*) from audit_log where action = 'credit_entry') >= 3, 'every credit entry is written to the activity log');
select t_check((select pending_paise from credit_balances where account_id = '00000000-0000-0000-0000-0000000000b1') = -500, 'final pending equals the sum of all lines');

-- ===== A customer =====
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_check(not is_admin(), 'customer is not the owner');
select t_check((select count(*) from credit_entries) = (select count(*) from credit_entries where account_id = '00000000-0000-0000-0000-0000000000b1') and (select count(*) from credit_entries) > 0, 'customer sees only their own credit lines');
select t_check((select count(*) from credit_accounts) = 1, 'customer sees only their own account');
select t_check((select count(*) from profiles) = 1, 'customer sees only their own profile');
select t_check((select pending_paise from get_my_balance()) = -500 and not (select hidden from get_my_balance()), 'customer can read their own balance');
select t_check(t_fails($$select add_credit_entry('00000000-0000-0000-0000-0000000000b1', 'payment', 100, '', current_date, p_confirm_advance => true)$$), 'customer cannot add a credit line');
select t_check(t_fails($$insert into credit_entries (account_id, entry_type, effect, amount_paise, entry_date, created_by) values ('00000000-0000-0000-0000-0000000000b1', 'payment', -1, 100, current_date, '00000000-0000-0000-0000-0000000000c1')$$), 'customer cannot write directly to the credit table');
select t_check(t_fails($$select mark_all_cleared('00000000-0000-0000-0000-0000000000b1')$$), 'customer cannot mark cleared');
select t_check((select count(*) from credit_balances) = 0, 'customer cannot use the owner balance view');
select t_check((select count(*) from audit_log) = 0, 'customer cannot read the activity log');

-- Customer two cannot see customer one.
select t_as('00000000-0000-0000-0000-0000000000c2');
select t_check((select count(*) from credit_entries where account_id = '00000000-0000-0000-0000-0000000000b1') = 0, 'customer two cannot read customer one credit lines');
select t_check((select count(*) from credit_accounts where id = '00000000-0000-0000-0000-0000000000b1') = 0, 'customer two cannot read customer one account');

-- The owner hides the balance from customer one.
select t_as('00000000-0000-0000-0000-0000000000a1');
update credit_accounts set show_balance = false where id = '00000000-0000-0000-0000-0000000000b1';
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_check((select hidden from get_my_balance()), 'a hidden balance says hidden, not all clear');
select t_check((select count(*) from credit_entries) = 0, 'a hidden balance also hides the lines');

-- ===== A visitor with no login =====
reset role;
select t_as('');
set local role anon;
select t_check((select count(*) from credit_entries) = 0, 'visitor cannot read credit lines');
select t_check((select count(*) from credit_accounts) = 0, 'visitor cannot read credit accounts');
select t_check((select count(*) from profiles) = 0, 'visitor cannot read people');
select t_check((select count(*) from login_attempts) = 0, 'visitor cannot read login attempts');
select t_check((select count(*) from audit_log) = 0, 'visitor cannot read the activity log');
select t_check((select count(*) from products) >= 1, 'visitor can read products');
select t_check((select count(*) from products where is_hidden) = 0, 'hidden products stay hidden');
select t_check(not is_admin(), 'visitor is not the owner');
select t_check(t_fails($$update products set name_en = 'x'$$) or (select count(*) from products where name_en = 'x') = 0, 'visitor cannot change products');

-- Search
-- Use exists() on specific test UUIDs so these tests pass on any database
-- (production may have real products that also match 'chawal' or 'secret').
select t_check(
  exists(select 1 from search_products('chawal') where id = '00000000-0000-0000-0000-0000000000d1'),
  'search finds test rice by the word chawal'
);
select t_check(
  not exists(select 1 from search_products('secret') where id = '00000000-0000-0000-0000-0000000000d2'),
  'search does not show hidden test product'
);

-- log_visit is SECURITY DEFINER so it works for any role.
-- COUNT checks are done later in the owner block where the admin_read_visits
-- RLS policy allows SELECT on visit_sources.
select log_visit('bag', 'qr');
select log_visit('bag', 'qr');
select log_visit('bad source!', '');

select log_search_miss('purple cow'); select log_search_miss('purple cow'); select log_search_miss('<script>');

-- Lists sent to the shop: five a day per phone, the sixth is refused.
select send_list('Visitor', '9111111111', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 2)));
select send_list('Visitor', '9111111111', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 1)));
select send_list('Visitor', '9111111111', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 1)));
select send_list('Visitor', '9111111111', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 1)));
select send_list('Visitor', '9111111111', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 1)));
select t_check(
  t_fails($$select send_list('Visitor', '9111111111', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 1)))$$),
  'the sixth list in a day is refused'
);
select t_check(t_fails($$select send_list('Visitor', '12345', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 1)))$$), 'a bad phone number is refused');
select t_check(t_fails($$select send_list('Visitor', '9222222222', '[]'::jsonb)$$), 'an empty list is refused');
-- Visitor RLS: count only the test phone lists since production may have others
select t_check((select count(*) from sent_lists) = 0, 'visitor cannot read sent lists');

-- A logged-in customer sends a list and can read only their own.
reset role;
select t_as('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select send_list('Test One', '9000000001', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-0000000000e1', 'quantity', 3)));
-- Count only this customer's own lists (RLS filters to customer_id = c1)
select t_check((select count(*) from sent_lists) = 1, 'customer reads only their own sent list');
select t_check(
  (select price_paise from sent_list_items si join sent_lists sl on sl.id = si.sent_list_id where sl.sender_phone = '9000000001' limit 1) = 6200
  and (select product_name_en from sent_list_items si join sent_lists sl on sl.id = si.sent_list_id where sl.sender_phone = '9000000001' limit 1) = 'Test Rice',
  'the sent list copies the name and price'
);
select t_check(t_fails($$select set_list_status((select id from sent_lists limit 1), 'ready')$$), 'customer cannot mark a list ready');
select t_as('00000000-0000-0000-0000-0000000000c2');
select t_check((select count(*) from sent_lists where customer_id = '00000000-0000-0000-0000-0000000000c1') = 0, 'customer two cannot read customer one list');

-- The owner reads every list and moves one to Ready.
select t_as('00000000-0000-0000-0000-0000000000a1');
-- Owner sees ALL lists; count only test phone lists to be production-safe
select t_check(
  (select count(*) from sent_lists where sender_phone in ('9111111111','9000000001')) = 6,
  'owner can see all test sent lists'
);
select t_check(
  (select count(*) from sent_lists where sender_phone = '9111111111' and status = 'replaced') = 4,
  'an older new list from the same phone becomes replaced'
);
select set_list_status((select id from sent_lists where sender_phone = '9000000001'), 'ready');
select t_check((select status from sent_lists where sender_phone = '9000000001') = 'ready', 'owner can mark a list ready');
select t_check(t_fails($$select set_list_status((select id from sent_lists limit 1), 'nonsense')$$), 'an unknown list status is refused');
select t_check((select miss_count from search_misses where term = 'purple cow') >= 2, 'repeated missing searches are counted');
select t_check((select count(*) from search_misses where term like '%script%') = 0, 'unsafe search words are not stored');
-- Visit checks run as owner (admin_read_visits RLS allows SELECT on visit_sources).
-- Uses >= 2 because production may already have 'bag' visits today.
select t_check(
  (select coalesce(sum(visits), 0) from visit_sources
   where source = 'bag' and medium = 'qr'
     and day = (now() at time zone 'Asia/Kolkata')::date) >= 2,
  'QR visits are counted'
);
select t_check(
  not exists(select 1 from visit_sources where source = 'bad source!'),
  'odd visit sources are not stored'
);

-- ===== customer_status view (migration 003) =====
-- Owner sees the customer rows.
select t_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
select t_check(
  (select count(*) from customer_status) >= 1,
  'owner can read customer_status and gets at least one row'
);

-- Customer gets zero rows (is_admin() is false for them).
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_check(
  (select count(*) from customer_status) = 0,
  'customer gets zero rows from customer_status'
);

-- Anonymous caller gets an error (no grant to anon).
reset role;
select t_as('');
set local role anon;
select t_check(
  t_fails($$select count(*) from customer_status$$),
  'anonymous caller cannot read customer_status'
);

-- ===== purge_old_sent_lists (migration 004) =====
select t_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;
-- Owner can call the function and gets an integer (number of rows deleted).
select t_check(
  (select purge_old_sent_lists()) >= 0,
  'owner can call purge_old_sent_lists and gets a row count'
);

-- Customer gets a permission denied error.
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_check(
  t_fails($$select purge_old_sent_lists()$$),
  'customer cannot call purge_old_sent_lists'
);

reset role;
select 'ALL PASSED' as result;
rollback;
