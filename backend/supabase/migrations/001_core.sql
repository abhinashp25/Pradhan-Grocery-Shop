-- Pradhan Grocery Store: core database setup (PostgreSQL on Supabase)
-- Run this on the TEST project first, then on the live project.
-- Money is always whole paise (Rs 125.50 = 12550).

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------
-- People
-- ---------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer' check (role in ('admin', 'customer', 'helper')),
  full_name   text not null,
  phone       text unique check (phone ~ '^[6-9][0-9]{9}$'),
  language    text not null default 'or' check (language in ('or', 'hi', 'en')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Wrong-PIN counter. Only the login Edge Function touches this.
create table login_attempts (
  phone         text primary key,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ---------------------------------------------------------------
-- Shop catalogue
-- ---------------------------------------------------------------
create table categories (
  id          smallint primary key,
  slug        text not null unique,
  name_en     text not null,
  name_or     text not null,
  name_hi     text,
  tint_hex    text not null,
  icon_key    text not null,
  sort_order  int not null,
  is_active   boolean not null default true
);

create table subcategories (
  id           serial primary key,
  category_id  smallint not null references categories(id),
  name_en      text not null,
  name_or      text not null,
  name_hi      text,
  sort_order   int not null default 0,
  is_active    boolean not null default true
);

create table products (
  id                uuid primary key default gen_random_uuid(),
  category_id       smallint not null references categories(id),
  subcategory_id    int references subcategories(id),
  name_en           text not null,
  name_or           text not null,
  name_hi           text,
  description_en    text,
  description_or    text,
  photo_path        text,
  shelf_spot        text,
  search_words      text not null default '',
  is_available      boolean not null default true,
  is_hidden         boolean not null default false,
  is_popular        boolean not null default false,
  price_is_approx   boolean not null default false,
  price_updated_at  timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table product_sizes (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  label        text not null,
  price_paise  int not null check (price_paise > 0),
  sort_order   int not null default 0,
  is_default   boolean not null default false
);

create index products_category_idx on products (category_id, is_hidden);
create index product_sizes_product_idx on product_sizes (product_id);
create index products_search_idx on products using gin (
  (lower(name_en || ' ' || name_or || ' ' || coalesce(name_hi, '') || ' ' || search_words)) gin_trgm_ops
);

-- When a price changes, remember the date. The dashboard uses it to find old prices.
create function touch_price_date() returns trigger
language plpgsql as $$
begin
  if new.price_paise is distinct from old.price_paise then
    update products set price_updated_at = now() where id = new.product_id;
  end if;
  return new;
end;
$$;
create trigger product_sizes_price_changed
  after update on product_sizes
  for each row execute function touch_price_date();

-- ---------------------------------------------------------------
-- Shop pages: banners, settings, services (Xerox and Print rates)
-- ---------------------------------------------------------------
create table banners (
  id          serial primary key,
  text_or     text,
  text_en     text,
  text_hi     text,
  image_path  text,
  show_on     text not null default 'home' check (show_on in ('home', 'puja')),
  is_active   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table shop_settings (
  id                      int primary key default 1 check (id = 1),
  name                    text not null,
  address                 text,
  phone                   text,
  whatsapp                text,
  timings                 text,
  map_link                text,
  large_amount_paise      bigint not null default 1000000,
  stale_price_days        int not null default 7,
  last_credit_export_at   timestamptz
);

create table services (
  id           serial primary key,
  name_en      text not null,
  name_or      text not null,
  name_hi      text,
  price_paise  int check (price_paise > 0),
  unit_label   text,
  price_note   text,
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

-- ---------------------------------------------------------------
-- Customer lists
-- ---------------------------------------------------------------
create table shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  title        text not null default 'My List',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table shopping_list_items (
  id               uuid primary key default gen_random_uuid(),
  list_id          uuid not null references shopping_lists(id) on delete cascade,
  product_size_id  uuid not null references product_sizes(id),
  quantity         smallint not null check (quantity between 1 and 99),
  unique (list_id, product_size_id)
);

-- A list sent to the shop. Names and prices are copied, so the owner
-- always sees what the customer saw, even if prices change later.
create table sent_lists (
  id                     uuid primary key default gen_random_uuid(),
  customer_id            uuid references profiles(id),
  sender_name            text not null,
  sender_phone           text not null check (sender_phone ~ '^[6-9][0-9]{9}$'),
  status                 text not null default 'new' check (status in ('new', 'ready', 'collected', 'replaced')),
  estimated_total_paise  bigint not null default 0,
  sent_at                timestamptz not null default now(),
  ready_at               timestamptz,
  collected_at           timestamptz
);

create table sent_list_items (
  id               uuid primary key default gen_random_uuid(),
  sent_list_id     uuid not null references sent_lists(id) on delete cascade,
  product_id       uuid references products(id),
  product_name_en  text not null,
  product_name_or  text not null,
  size_label       text not null,
  price_paise      int not null,
  quantity         smallint not null check (quantity between 1 and 99)
);

create index sent_lists_phone_idx on sent_lists (sender_phone, sent_at desc);

-- ---------------------------------------------------------------
-- Credit book. Lines are written once and never changed.
-- ---------------------------------------------------------------
create table credit_accounts (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null unique references profiles(id),
  show_balance  boolean not null default true,
  is_active     boolean not null default true,
  opened_on     date not null default current_date,
  notes         text
);

create table credit_entries (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references credit_accounts(id),
  entry_type     text not null check (entry_type in ('credit', 'payment', 'correction')),
  effect         smallint not null check (effect in (1, -1)),
  amount_paise   bigint not null check (amount_paise > 0),
  note           text,
  reason         text,
  entry_date     date not null,
  correction_of  uuid references credit_entries(id),
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  check (entry_type <> 'credit'  or effect = 1),
  check (entry_type <> 'payment' or effect = -1),
  check (entry_type <> 'correction' or (reason is not null and correction_of is not null))
);

create index credit_entries_account_idx on credit_entries (account_id, entry_date desc, created_at desc);

-- Lock 1: no one can change or delete a credit line.
create function block_credit_changes() returns trigger
language plpgsql as $$
begin
  raise exception 'Credit lines cannot be changed.';
end;
$$;
create trigger credit_entries_no_update before update or delete on credit_entries
  for each row execute function block_credit_changes();
create trigger credit_entries_no_truncate before truncate on credit_entries
  for each statement execute function block_credit_changes();

-- Lock 2: the app roles do not even have the permission.
revoke update, delete, truncate on credit_entries from anon, authenticated;

-- An entry date can be earlier (notebook entries) but never in the future (Indian date).
create function check_entry_date() returns trigger
language plpgsql as $$
begin
  if new.entry_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'The date cannot be in the future.';
  end if;
  return new;
end;
$$;
create trigger credit_entries_date_check before insert on credit_entries
  for each row execute function check_entry_date();

-- ---------------------------------------------------------------
-- Search misses, visit sources (QR / UTM), activity log
-- ---------------------------------------------------------------
create table search_misses (
  term        text primary key,
  miss_count  int not null default 1,
  last_seen   timestamptz not null default now()
);

-- Counts only. No names, no phone numbers, no device ids.
create table visit_sources (
  day     date not null,
  source  text not null,
  medium  text not null default '',
  visits  int not null default 1,
  primary key (day, source, medium)
);

create table audit_log (
  id          bigserial primary key,
  actor_id    uuid,
  action      text not null,
  table_name  text not null,
  row_id      text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create function write_audit(p_action text, p_table text, p_row text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, action, table_name, row_id, details)
  values (auth.uid(), p_action, p_table, p_row, p_details);
$$;

create function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor_id, action, table_name, row_id, details)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id')),
          jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
  return coalesce(new, old);
end;
$$;

create trigger audit_products after insert or update or delete on products
  for each row execute function audit_row();
create trigger audit_product_sizes after insert or update or delete on product_sizes
  for each row execute function audit_row();
create trigger audit_profiles after insert or update on profiles
  for each row execute function audit_row();
create trigger audit_credit_accounts after insert or update on credit_accounts
  for each row execute function audit_row();
create trigger audit_services after insert or update or delete on services
  for each row execute function audit_row();
create trigger audit_settings after update on shop_settings
  for each row execute function audit_row();

-- ---------------------------------------------------------------
-- Credit book functions. These hold the rules.
-- ---------------------------------------------------------------
create function credit_pending(p_account uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount_paise * effect), 0)::bigint
  from credit_entries where account_id = p_account;
$$;

create function add_credit_entry(
  p_account          uuid,
  p_type             text,
  p_amount_paise     bigint,
  p_note             text,
  p_entry_date       date,
  p_reason           text default null,
  p_correction_of    uuid default null,
  p_correction_effect smallint default null,
  p_confirm_advance  boolean default false
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_effect   smallint;
  v_pending  bigint;
  v_new_id   uuid;
begin
  if not is_admin() then
    raise exception 'Only the owner can change the credit book.';
  end if;
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'The amount must be more than zero.';
  end if;

  v_pending := credit_pending(p_account);

  if p_type = 'credit' then
    v_effect := 1;
  elsif p_type = 'payment' then
    v_effect := -1;
    if p_amount_paise > v_pending and not p_confirm_advance then
      raise exception 'This payment is more than the pending amount. Confirm it as an advance.';
    end if;
  elsif p_type = 'correction' then
    if p_correction_effect not in (1, -1) then
      raise exception 'Say whether the correction adds or reduces the amount.';
    end if;
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'A correction needs a reason.';
    end if;
    if not exists (select 1 from credit_entries where id = p_correction_of and account_id = p_account) then
      raise exception 'Pick the old line this correction fixes.';
    end if;
    v_effect := p_correction_effect;
  else
    raise exception 'Unknown entry type.';
  end if;

  insert into credit_entries
    (account_id, entry_type, effect, amount_paise, note, reason, entry_date, correction_of, created_by)
  values
    (p_account, p_type, v_effect, p_amount_paise, p_note, p_reason, p_entry_date, p_correction_of, auth.uid())
  returning id into v_new_id;

  perform write_audit('credit_entry', 'credit_entries', v_new_id::text,
    jsonb_build_object('type', p_type, 'amount_paise', p_amount_paise));

  return credit_pending(p_account);
end;
$$;

create function mark_all_cleared(p_account uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_pending bigint;
begin
  if not is_admin() then
    raise exception 'Only the owner can change the credit book.';
  end if;
  v_pending := credit_pending(p_account);
  if v_pending <= 0 then
    raise exception 'Nothing is pending for this customer.';
  end if;
  insert into credit_entries
    (account_id, entry_type, effect, amount_paise, note, entry_date, created_by)
  values
    (p_account, 'payment', -1, v_pending, 'Marked all cleared',
     (now() at time zone 'Asia/Kolkata')::date, auth.uid());
  perform write_audit('mark_all_cleared', 'credit_accounts', p_account::text,
    jsonb_build_object('amount_paise', v_pending));
  return 0;
end;
$$;

-- Owner view of every balance. Customers must use get_my_balance() instead,
-- because a hidden balance would otherwise look like "all clear".
create view credit_balances as
  select a.id as account_id,
         a.customer_id,
         coalesce(sum(e.amount_paise * e.effect), 0)::bigint as pending_paise,
         max(e.created_at) as last_entry_at,
         case
           when coalesce(sum(e.amount_paise * e.effect), 0) > 0 then 'pending'
           when coalesce(sum(e.amount_paise * e.effect), 0) < 0 then 'advance'
           else 'cleared'
         end as status
  from credit_accounts a
  left join credit_entries e on e.account_id = a.id
  where is_admin()
  group by a.id;

create function get_my_balance()
returns table (hidden boolean, pending_paise bigint, status text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_account credit_accounts;
  v_pending bigint;
begin
  select * into v_account from credit_accounts where customer_id = auth.uid();
  if not found then
    return;
  end if;
  if not v_account.show_balance then
    return query select true, 0::bigint, 'hidden'::text;
    return;
  end if;
  v_pending := credit_pending(v_account.id);
  return query select false, v_pending,
    case when v_pending > 0 then 'pending' when v_pending < 0 then 'advance' else 'cleared' end;
end;
$$;

-- ---------------------------------------------------------------
-- Lists sent to the shop
-- p_items example: [{"size_id": "...", "quantity": 2}]
-- ---------------------------------------------------------------
create function send_list(p_name text, p_phone text, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_list_id  uuid;
  v_today    int;
  v_total    bigint := 0;
  v_row      record;
begin
  if p_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'Please enter a 10-digit phone number.';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Please enter your name.';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'The list is empty.';
  end if;

  select count(*) into v_today from sent_lists
  where sender_phone = p_phone
    and (sent_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date;
  if v_today >= 5 then
    raise exception 'Too many lists today. Please call the shop.';
  end if;

  -- An older list from the same phone that is still new is now replaced.
  update sent_lists set status = 'replaced'
  where sender_phone = p_phone and status = 'new';

  insert into sent_lists (customer_id, sender_name, sender_phone)
  values (auth.uid(), trim(p_name), p_phone)
  returning id into v_list_id;

  for v_row in
    select s.label, s.price_paise, p.id as product_id, p.name_en, p.name_or,
           least(greatest((i ->> 'quantity')::int, 1), 99) as qty
    from jsonb_array_elements(p_items) as i
    join product_sizes s on s.id = (i ->> 'size_id')::uuid
    join products p on p.id = s.product_id
  loop
    insert into sent_list_items
      (sent_list_id, product_id, product_name_en, product_name_or, size_label, price_paise, quantity)
    values
      (v_list_id, v_row.product_id, v_row.name_en, v_row.name_or, v_row.label, v_row.price_paise, v_row.qty);
    v_total := v_total + v_row.price_paise * v_row.qty;
  end loop;

  update sent_lists set estimated_total_paise = v_total where id = v_list_id;
  return v_list_id;
end;
$$;

create function set_list_status(p_list uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Only the owner can do this.';
  end if;
  if p_status not in ('ready', 'collected') then
    raise exception 'Unknown status.';
  end if;
  update sent_lists
  set status = p_status,
      ready_at = case when p_status = 'ready' then now() else ready_at end,
      collected_at = case when p_status = 'collected' then now() else collected_at end
  where id = p_list;
  perform write_audit('list_' || p_status, 'sent_lists', p_list::text, null);
end;
$$;

-- ---------------------------------------------------------------
-- Search, search misses, visit sources
-- ---------------------------------------------------------------
create function search_products(q text)
returns setof products
language sql stable security definer set search_path = public as $$
  select p.* from products p
  where not p.is_hidden
    and (lower(p.name_en || ' ' || p.name_or || ' ' || coalesce(p.name_hi, '') || ' ' || p.search_words)
         like '%' || lower(trim(q)) || '%'
         or similarity(lower(p.name_en || ' ' || p.search_words), lower(trim(q))) > 0.25)
  order by p.is_available desc, p.is_popular desc,
           similarity(lower(p.name_en || ' ' || p.search_words), lower(trim(q))) desc
  limit 60;
$$;

create function log_search_miss(p_term text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_term text := lower(trim(p_term));
begin
  if length(v_term) < 2 or length(v_term) > 40 or v_term ~ '[<>/\\]' then
    return;
  end if;
  insert into search_misses (term) values (v_term)
  on conflict (term) do update set miss_count = search_misses.miss_count + 1, last_seen = now();
end;
$$;

create function log_visit(p_source text, p_medium text default '') returns void
language plpgsql security definer set search_path = public as $$
declare
  v_source text := lower(left(trim(coalesce(p_source, '')), 30));
  v_medium text := lower(left(trim(coalesce(p_medium, '')), 30));
begin
  if v_source = '' or v_source !~ '^[a-z0-9_-]+$' then
    return;
  end if;
  insert into visit_sources (day, source, medium)
  values ((now() at time zone 'Asia/Kolkata')::date, v_source, v_medium)
  on conflict (day, source, medium) do update set visits = visit_sources.visits + 1;
end;
$$;

-- ---------------------------------------------------------------
-- Row-level security. Every table is locked unless a rule below opens it.
-- ---------------------------------------------------------------
alter table profiles            enable row level security;
alter table login_attempts      enable row level security;
alter table categories          enable row level security;
alter table subcategories       enable row level security;
alter table products            enable row level security;
alter table product_sizes       enable row level security;
alter table banners             enable row level security;
alter table shop_settings       enable row level security;
alter table services            enable row level security;
alter table shopping_lists      enable row level security;
alter table shopping_list_items enable row level security;
alter table sent_lists          enable row level security;
alter table sent_list_items     enable row level security;
alter table credit_accounts     enable row level security;
alter table credit_entries      enable row level security;
alter table search_misses       enable row level security;
alter table visit_sources       enable row level security;
alter table audit_log           enable row level security;

-- Everyone can read the shop. Only the owner can change it.
create policy read_categories    on categories    for select using (is_active or is_admin());
create policy read_subcategories on subcategories for select using (is_active or is_admin());
create policy read_products      on products      for select using (not is_hidden or is_admin());
create policy read_sizes         on product_sizes for select using (true);
create policy read_banners       on banners       for select using (is_active or is_admin());
create policy read_settings      on shop_settings for select using (true);
create policy read_services      on services      for select using (is_active or is_admin());

create policy admin_write_categories    on categories    for all using (is_admin()) with check (is_admin());
create policy admin_write_subcategories on subcategories for all using (is_admin()) with check (is_admin());
create policy admin_write_products      on products      for all using (is_admin()) with check (is_admin());
create policy admin_write_sizes         on product_sizes for all using (is_admin()) with check (is_admin());
create policy admin_write_banners       on banners       for all using (is_admin()) with check (is_admin());
create policy admin_write_settings      on shop_settings for update using (is_admin()) with check (is_admin());
create policy admin_write_services      on services      for all using (is_admin()) with check (is_admin());

-- People
create policy read_own_profile  on profiles for select using (id = auth.uid() or is_admin());
create policy admin_write_profiles on profiles for all using (is_admin()) with check (is_admin());

-- Lists belong to one customer
create policy own_lists on shopping_lists for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy own_list_items on shopping_list_items for all
  using (exists (select 1 from shopping_lists l where l.id = list_id and l.customer_id = auth.uid()))
  with check (exists (select 1 from shopping_lists l where l.id = list_id and l.customer_id = auth.uid()));

-- Sent lists: owner sees all, a customer sees their own. Rows are created only by send_list().
create policy read_sent_lists on sent_lists for select
  using (is_admin() or customer_id = auth.uid());
create policy read_sent_items on sent_list_items for select
  using (is_admin() or exists (
    select 1 from sent_lists l where l.id = sent_list_id and l.customer_id = auth.uid()));

-- Credit book. No insert policy on purpose: lines are added only by add_credit_entry() and mark_all_cleared().
create policy read_credit_accounts on credit_accounts for select
  using (is_admin() or customer_id = auth.uid());
create policy admin_update_credit_accounts on credit_accounts for update
  using (is_admin()) with check (is_admin());
create policy read_credit_entries on credit_entries for select
  using (is_admin() or exists (
    select 1 from credit_accounts a
    where a.id = account_id and a.customer_id = auth.uid() and a.show_balance));

-- Owner-only reading
create policy admin_read_audit  on audit_log      for select using (is_admin());
create policy admin_read_misses on search_misses  for select using (is_admin());
create policy admin_read_visits on visit_sources  for select using (is_admin());
-- login_attempts has no policy: only the Edge Function (service key) can use it.

-- Who may run which function
revoke execute on function add_credit_entry, mark_all_cleared, set_list_status from public, anon;
grant  execute on function add_credit_entry, mark_all_cleared, set_list_status to authenticated;
grant  execute on function send_list, search_products, log_search_miss, log_visit to anon, authenticated;
grant  execute on function get_my_balance to authenticated;
grant  select on credit_balances to authenticated;

-- Table-level grants (required in addition to RLS policies)
-- Both anon and authenticated need SELECT on every table.
-- RLS policies decide which rows each role actually sees.

-- anon (visitor): can SELECT all tables; RLS returns only public rows
grant select on
      categories, subcategories, products, product_sizes,
      banners, shop_settings, services,
      profiles, login_attempts,
      shopping_lists, shopping_list_items,
      sent_lists, sent_list_items,
      credit_accounts, credit_entries,
      audit_log, search_misses, visit_sources to anon;

-- authenticated: read everything + write own data
grant select on
      categories, subcategories, products, product_sizes,
      banners, shop_settings, services,
      profiles, login_attempts,
      shopping_lists, shopping_list_items,
      sent_lists, sent_list_items,
      credit_accounts, credit_entries,
      audit_log, search_misses, visit_sources to authenticated;
grant insert, update, delete on
      profiles, shopping_lists, shopping_list_items to authenticated;
grant select, insert, update on credit_accounts to authenticated;
grant insert on sent_lists, sent_list_items to authenticated;

-- ---------------------------------------------------------------
-- First rows
-- ---------------------------------------------------------------
insert into categories (id, slug, name_en, name_or, tint_hex, icon_key, sort_order) values
  (1, 'grocery',    'Grocery',                 'ଗ୍ରୋସରୀ',        '#FFE9C7', 'basket',  1),
  (2, 'vegetables', 'Vegetables',              'ପନିପରିବା',       '#DDF1DF', 'leaf',    2),
  (3, 'fruits',     'All Fruits',              'ସବୁ ଫଳ',         '#FFE0DA', 'apple',   3),
  (4, 'puja',       'Puja Samagri',            'ପୂଜା ସାମଗ୍ରୀ',   '#FFF0B8', 'diya',    4),
  (5, 'stationery', 'Books and Pens',          'ବହି ଓ କଲମ',       '#DCEBFA', 'book',    5),
  (6, 'kids',       'Kids and Candy',          'ପିଲାଙ୍କ ଜିନିଷ',  '#FFF3C4', 'candy',   6),
  (7, 'colours',    'Colours and Festival',    'ରଙ୍ଗ',            '#FFD9EC', 'colours', 7),
  (8, 'beauty',     'Beauty and Personal Care','ସୌନ୍ଦର୍ଯ୍ୟ',    '#E8DDFB', 'bottle',  8);

insert into shop_settings (id, name) values (1, 'Pradhan Grocery Store');

insert into services (name_en, name_or, unit_label, sort_order) values
  ('Photocopy (black and white)', 'ଫଟୋକପି (କଳା ଓ ଧଳା)', 'per page', 1),
  ('Photocopy (colour)',          'ଫଟୋକପି (ରଙ୍ଗୀନ)',    'per page', 2),
  ('Printout',                    'ପ୍ରିଣ୍ଟ',            'per page', 3),
  ('Lamination',                  'ଲାମିନେସନ୍',          '',         4),
  ('Spiral binding',              'ସ୍ପାଇରାଲ ବାଇଣ୍ଡିଂ',  '',         5);
