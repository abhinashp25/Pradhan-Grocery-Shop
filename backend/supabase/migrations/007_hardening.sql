-- Migration 007: hardening.

-- 1. The owner's two-step code must really be required.
--    Before: the code was only checked by the login screen, so a password alone could still
--    reach the credit book. Now: if the owner has set up a two-step code, the database treats
--    them as the owner only when the session has passed the code step (aal2).
--    If no code is set up yet, nothing changes, so the owner is never locked out by this file.
--    If the owner loses the phone, delete their factor in Supabase: Authentication, Users.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
           select 1 from profiles where id = auth.uid() and role = 'admin' and is_active
         )
     and (
           coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
           or not exists (
             select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'
           )
         );
$$;

-- 2. A list whose items are all gone from the shop is refused, instead of being saved empty.
create or replace function send_list(p_name text, p_phone text, p_items jsonb)
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

  if not exists (select 1 from sent_list_items where sent_list_id = v_list_id) then
    raise exception 'None of these items are for sale any more. Please check your list.';
  end if;

  update sent_lists set estimated_total_paise = v_total where id = v_list_id;
  return v_list_id;
end;
$$;
