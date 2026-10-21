-- Photo folders. Anyone can look at photos; only the owner can add, change or remove them.
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true), ('banners', 'banners', true)
on conflict (id) do nothing;

create policy "photos are public" on storage.objects for select
  using (bucket_id in ('product-photos', 'banners'));
create policy "owner adds photos" on storage.objects for insert
  with check (bucket_id in ('product-photos', 'banners') and is_admin());
create policy "owner changes photos" on storage.objects for update
  using (bucket_id in ('product-photos', 'banners') and is_admin());
create policy "owner removes photos" on storage.objects for delete
  using (bucket_id in ('product-photos', 'banners') and is_admin());
