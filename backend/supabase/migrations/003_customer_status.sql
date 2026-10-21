-- Migration 003: owner view of customer login status.
-- Lists last_sign_in_at from auth.users and locked_until from login_attempts.
--
-- Why security_invoker = false?
--   By default, PostgreSQL views run as the calling user (SECURITY INVOKER).
--   The `authenticated` role cannot read auth.users, so the view would throw a
--   permission error. Setting security_invoker = false makes the view run as its
--   owner (postgres), who can always read auth.users.
--   is_admin() is SECURITY DEFINER and reads auth.uid() from the JWT token,
--   so the caller check is still correct — only the owner gets rows.
--
-- DROP IF EXISTS is safe to run even if the old (broken) version was already applied.

drop view if exists customer_status;

create view customer_status
  with (security_invoker = false)
as
  select
    p.id                    as customer_id,
    p.full_name,
    p.phone,
    u.last_sign_in_at,
    la.locked_until
  from profiles p
  join auth.users u on u.id = p.id
  left join login_attempts la on la.phone = p.phone
  where p.role = 'customer'
    and is_admin();

-- Grant SELECT to authenticated only.
-- Even though authenticated can now query the view, is_admin() in the WHERE
-- clause guarantees that a customer or visitor gets zero rows.
grant select on customer_status to authenticated;
