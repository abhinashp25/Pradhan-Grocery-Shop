-- Migration 008: permissions for the server functions, and photo folders again.
--
-- 1. The login and owner Edge Functions use the secret service key (the role "service_role").
--    On this Supabase project that role was never given permission on our tables, so the
--    functions could not read the profiles table. The result: "Only the owner can do this"
--    when adding a customer, and customer login that could never work.
-- 2. The photo policies from 002 are created again, so a missing or damaged policy
--    can no longer stop the owner from uploading photos. Safe to run more than once.

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables and functions made by later migrations get the same permission automatically.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true), ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "photos are public"      on storage.objects;
drop policy if exists "owner adds photos"      on storage.objects;
drop policy if exists "owner changes photos"   on storage.objects;
drop policy if exists "owner removes photos"   on storage.objects;

create policy "photos are public" on storage.objects for select
  using (bucket_id in ('product-photos', 'banners'));
create policy "owner adds photos" on storage.objects for insert
  with check (bucket_id in ('product-photos', 'banners') and is_admin());
create policy "owner changes photos" on storage.objects for update
  using (bucket_id in ('product-photos', 'banners') and is_admin())
  with check (bucket_id in ('product-photos', 'banners') and is_admin());
create policy "owner removes photos" on storage.objects for delete
  using (bucket_id in ('product-photos', 'banners') and is_admin());
