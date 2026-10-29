-- Migration 011: auto-set updated_at on banners server-side.
--
-- Security fix: Settings.tsx was sending `updated_at: new Date().toISOString()`
-- from the browser clock. An attacker with owner credentials could set an
-- arbitrary timestamp to confuse any future "last changed" audit trail.
-- This trigger overwrites the client value with the real server time,
-- matching the same pattern used for products (migration 010).

create or replace function touch_banner_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists banners_set_updated_at on banners;
create trigger banners_set_updated_at
  before update on banners
  for each row execute function touch_banner_updated_at();

-- Permissions: trigger function is called internally; no app role invokes it
-- directly, so no GRANT is required on the function itself.
-- The banners table grants are already in 006_grants.sql.

