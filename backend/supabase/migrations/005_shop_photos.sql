-- Migration 005: shop photos table.
--
-- The 'banners' storage bucket already exists (002_storage.sql).
-- This migration adds a metadata table that tracks which photos are stored
-- in that bucket, their display order, and an optional English caption.
-- The owner manages rows via Settings. Customers see them on ShopInfo.
--
-- Two things are required for Supabase access:
--   1. RLS policies  — control which ROWS each role can see or change.
--   2. Table grants  — control whether a role can touch the TABLE at all.
-- Without the grants, RLS is never reached and the query fails silently.

create table shop_photos (
  id           serial primary key,
  -- Path inside the 'banners' storage bucket, e.g. 'shop/1700000000000.webp'
  storage_path text         not null unique,
  caption_en   text,
  sort_order   smallint     not null default 0,
  created_at   timestamptz  not null default now()
);

-- RLS: visitors and customers can read; only the owner can write.
-- Splitting SELECT from the write policies avoids ambiguity when
-- both a public SELECT policy and an owner write policy exist on one table.
alter table shop_photos enable row level security;
create policy photos_public_read  on shop_photos for select using (true);
create policy photos_owner_insert on shop_photos for insert with check (is_admin());
create policy photos_owner_update on shop_photos for update using (is_admin()) with check (is_admin());
create policy photos_owner_delete on shop_photos for delete using (is_admin());

-- Index so the ShopInfo query (ORDER BY sort_order, id) is fast.
create index shop_photos_order_idx on shop_photos (sort_order, id);

-- Table-level grants (RLS applies on top of these).
-- anon   = visitors browsing without a login
-- authenticated = logged-in customers and the owner
grant select                    on shop_photos             to anon, authenticated;
grant insert, update, delete    on shop_photos             to authenticated;
-- The serial sequence must be readable to allow INSERT with auto-increment id.
grant usage, select             on sequence shop_photos_id_seq to authenticated;
