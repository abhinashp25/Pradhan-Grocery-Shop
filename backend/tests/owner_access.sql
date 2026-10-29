-- Tests: what the owner, a customer and a visitor may and may not change.
-- Run on the TEST Supabase project, after migrations 001 to 007. Rolls back at the end.
-- The last result must say ALL PASSED. A failure stops the script with a message that starts with FAIL.

begin;

create function public.t_check(ok boolean, test_name text) returns text language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', test_name; end if;
  return 'PASS: ' || test_name;
end $$;

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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 'one@test.invalid');
insert into profiles (id, role, full_name, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin', 'Test Owner', null),
  ('00000000-0000-0000-0000-0000000000c1', 'customer', 'Test One', '9000000001');
insert into credit_accounts (id, customer_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1');

-- ===== The owner can run the whole shop =====
select t_as('00000000-0000-0000-0000-0000000000a1');
set local role authenticated;

select t_check(is_admin(), 'owner is the owner');
select t_check(not t_fails($$insert into products (id, category_id, name_en, name_or) values ('00000000-0000-0000-0000-0000000000f1', 1, 'Owner Test', 'à¬Ÿà­‡à¬·à­à¬Ÿ')$$), 'owner can add a product');
select t_check(not t_fails($$insert into product_sizes (id, product_id, label, price_paise, is_default) values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1', '1 kg', 5000, true)$$), 'owner can add a price');
select t_check(not t_fails($$update products set is_available = false where id = '00000000-0000-0000-0000-0000000000f1'$$), 'owner can mark a product finished');
select t_check(not t_fails($$update product_sizes set price_paise = 5500 where id = '00000000-0000-0000-0000-0000000000f2'$$), 'owner can change a price');
select t_check((select price_updated_at from products where id = '00000000-0000-0000-0000-0000000000f1') is not null, 'the price date is kept');
-- Migration 010: server-side updated_at trigger (security fix - browser clock must not control this).
select t_check((select updated_at from products where id = '00000000-0000-0000-0000-0000000000f1') is not null, 'trigger sets updated_at after update');
select t_check(not t_fails($$update shop_settings set phone = '9000000009' where id = 1$$), 'owner can change shop settings');
-- Migration 011: server-side updated_at trigger for banners (security fix).
select t_check(not t_fails($$update banners set text_en = 'Updated' where id = (select id from banners limit 1)$$), 'owner can update a banner');
select t_check((select updated_at from banners order by id limit 1) is not null, 'banner trigger sets updated_at server-side');
select t_check(not t_fails($$insert into banners (text_en, is_active) values ('Test banner', false)$$), 'owner can add a banner');
select t_check(not t_fails($$update services set price_paise = 100$$), 'owner can set Xerox rates');
select t_check(not t_fails($$insert into subcategories (category_id, name_en, name_or) values (1, 'Test group', 'à¬—à­à¬°à­à¬ªà­')$$), 'owner can add a sub-group');
select t_check(not t_fails($$insert into shop_photos (storage_path) values ('shop/test.webp')$$), 'owner can add a shop photo');
select t_check(not t_fails($$update credit_accounts set show_balance = false where id = '00000000-0000-0000-0000-0000000000b1'$$), 'owner can hide a balance from a customer');
select t_check(not t_fails($$update credit_accounts set show_balance = true where id = '00000000-0000-0000-0000-0000000000b1'$$), 'owner can show a balance again');
select t_check((select count(*) from customer_status) >= 1, 'owner can read customer login status');
select t_check((select count(*) from credit_balances) >= 1, 'owner can read all balances');
select t_check(not t_fails($$select * from audit_log$$) and not t_fails($$select * from search_misses$$) and not t_fails($$select * from visit_sources$$), 'owner can read the activity log and counters');
select t_check(not t_fails($$delete from products where id = '00000000-0000-0000-0000-0000000000f1'$$), 'owner can remove a product');

-- ===== A customer can change none of that =====
select t_as('00000000-0000-0000-0000-0000000000c1');
select t_check(not is_admin(), 'customer is not the owner');
select t_check(t_fails($$insert into products (category_id, name_en, name_or) values (1, 'x', 'x')$$), 'customer cannot add a product');
select t_check((select count(*) from products where name_en = 'x') = 0, 'customer product was not saved');
update products set name_en = 'hacked';
select t_check((select count(*) from products where name_en = 'hacked') = 0, 'customer cannot rename products');
update product_sizes set price_paise = 1;
select t_check((select count(*) from product_sizes where price_paise = 1) = 0, 'customer cannot change prices');
update shop_settings set phone = '1111111111';
select t_check((select phone from shop_settings where id = 1) <> '1111111111', 'customer cannot change shop settings');
select t_check(t_fails($$insert into banners (text_en) values ('x')$$), 'customer cannot add a banner');
select t_check(t_fails($$insert into shop_photos (storage_path) values ('shop/hack.webp')$$), 'customer cannot add a shop photo');
update credit_accounts set show_balance = false;
select t_check((select show_balance from credit_accounts) = true, 'customer cannot hide their own balance setting');
select t_check((select count(*) from audit_log) = 0, 'customer sees no activity log');
select t_check((select count(*) from customer_status) = 0, 'customer sees no customer status');
select t_check((select count(*) from search_misses) = 0 and (select count(*) from visit_sources) = 0, 'customer sees no counters');

-- ===== A visitor with no login =====
reset role;
select t_as('');
set local role anon;
select t_check(t_fails($$insert into products (category_id, name_en, name_or) values (1, 'x', 'x')$$), 'visitor cannot add a product');
select t_check(t_fails($$update products set name_en = 'x'$$), 'visitor cannot change a product');
select t_check(t_fails($$select * from credit_entries$$), 'visitor has no access to credit lines at all');
select t_check(t_fails($$select * from credit_accounts$$), 'visitor has no access to credit accounts at all');
select t_check(t_fails($$select * from profiles$$), 'visitor has no access to people at all');
select t_check(t_fails($$select * from audit_log$$), 'visitor has no access to the activity log');
select t_check(t_fails($$select * from login_attempts$$), 'visitor has no access to login attempts');
select t_check(t_fails($$select * from sent_lists$$), 'visitor has no access to sent lists');
select t_check(not t_fails($$select * from products$$) and not t_fails($$select * from categories$$) and not t_fails($$select * from shop_settings$$), 'visitor can read the shop');
select t_check(t_fails($$select send_list('Visitor', '9333333333', jsonb_build_array(jsonb_build_object('size_id', '00000000-0000-0000-0000-000000000999', 'quantity', 1)))$$), 'a list of items that are not for sale is refused');

reset role;
select 'ALL PASSED' as result;
rollback;
