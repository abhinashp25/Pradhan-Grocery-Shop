-- Migration 009: how old is each customer's unpaid credit, and lock two internal functions.
--
-- "How old" works like a shop notebook: payments are counted against the OLDEST credit first.
-- The age is the date of the oldest credit that is still not fully paid.
-- Example: 1000 taken on day 1, 500 taken on day 20, 1000 paid on day 25.
--          The first 1000 is paid. The oldest unpaid credit is the one from day 20.
-- Nothing is typed in by hand. It is worked out from the credit lines every time.

alter table shop_settings
  add column if not exists credit_reminder_days int not null default 30
  check (credit_reminder_days between 1 and 365);

create or replace function credit_oldest_unpaid(p_account uuid) returns date
language sql stable security definer set search_path = public as $$
  with paid as (
    select coalesce(sum(amount_paise), 0) as total
    from credit_entries where account_id = p_account and effect = -1
  ),
  charges as (
    select entry_date,
           sum(amount_paise) over (order by entry_date, created_at, id) as running
    from credit_entries where account_id = p_account and effect = 1
  )
  select c.entry_date
  from charges c, paid p
  where c.running > p.total
    and credit_pending(p_account) > 0
  order by c.running
  limit 1;
$$;

-- Owner only: one row per customer account with the age of the oldest unpaid credit.
-- (A function, not a view: the app roles may not call the helpers directly, and a view would
-- call them with the app's rights. A function runs with the database owner's rights.)
create or replace function credit_aging()
returns table (account_id uuid, customer_id uuid, pending_paise bigint, oldest_unpaid_date date, days_pending int)
language sql stable security definer set search_path = public as $$
  select a.id,
         a.customer_id,
         credit_pending(a.id),
         credit_oldest_unpaid(a.id),
         ((now() at time zone 'Asia/Kolkata')::date - credit_oldest_unpaid(a.id))::int
  from credit_accounts a
  where is_admin();
$$;

-- Customer: the age of their own oldest unpaid credit. Empty when the owner hides their balance.
create or replace function get_my_credit_age()
returns table (days_pending int, oldest_unpaid_date date, reminder_days int)
language plpgsql stable security definer set search_path = public as $$
declare
  v_account credit_accounts;
  v_oldest  date;
begin
  select * into v_account from credit_accounts where customer_id = auth.uid();
  if not found or not v_account.show_balance then
    return;
  end if;
  v_oldest := credit_oldest_unpaid(v_account.id);
  return query select
    ((now() at time zone 'Asia/Kolkata')::date - v_oldest)::int,
    v_oldest,
    (select credit_reminder_days from shop_settings where id = 1);
end;
$$;

revoke execute on function credit_aging()     from public, anon;
revoke execute on function get_my_credit_age() from public, anon;
grant  execute on function credit_aging()     to authenticated;
grant  execute on function get_my_credit_age() to authenticated;

-- Two internal helpers were callable by anyone who knew a customer id. They are for the
-- database functions only, so the app roles lose the right to call them directly.
revoke execute on function credit_pending(uuid)                  from public, anon, authenticated;
revoke execute on function credit_oldest_unpaid(uuid)            from public, anon, authenticated;
revoke execute on function write_audit(text, text, text, jsonb)  from public, anon, authenticated;
-- (The functions that call them run with the owner's rights, so they keep working.)
