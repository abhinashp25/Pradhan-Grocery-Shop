-- Migration 010: auto-set updated_at on products server-side.
--
-- Security fix: the frontend was setting `updated_at` from the browser clock
-- (ProductEdit.tsx). An attacker could back-date or future-date this field to
-- hide stale price warnings. This trigger overwrites the client value with the
-- real server time.
--
-- The same pattern already exists for product_sizes (touch_price_date).

create or replace function touch_product_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function touch_product_updated_at();

-- Permissions: this function runs as a trigger (SECURITY DEFINER not needed),
-- and no app role calls it directly, so no grant is required.

-- Add to owner_access tests: verify the trigger fires.
-- (See backend/tests/owner_access.sql for the test pattern.)

