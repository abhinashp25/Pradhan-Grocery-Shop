-- FOR THE TEST PROJECT ONLY. Never run this on the live database.
-- A few sample products so every screen has something to show.
do $$
declare
  p uuid;
begin
  -- Running this twice would make every product twice, so the second run does nothing.
  if exists (select 1 from products where name_en = 'Sona Masoori Rice') then
    raise notice 'Sample products are already there. Nothing was added.';
    return;
  end if;
  insert into products (category_id, name_en, name_or, search_words, is_popular) values (1, 'Sona Masoori Rice', 'ସୋନା ମସୁରୀ ଚାଉଳ', 'chawal, rice', true) returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 kg', 6200, 0, true), (p, '5 kg', 30000, 1, false);
  insert into products (category_id, name_en, name_or, search_words, is_popular) values (1, 'Toor Dal', 'ଅରହର ଡାଲି', 'dal, daal', true) returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 kg', 15000, 0, true);
  insert into products (category_id, name_en, name_or, is_available) values (1, 'Mustard Oil', 'ସୋରିଷ ତେଲ', false) returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 litre', 17000, 0, true);
  insert into products (category_id, name_en, name_or) values (2, 'Tomato', 'ଟମାଟୋ') returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 kg', 4000, 0, true);
  insert into products (category_id, name_en, name_or) values (3, 'Banana', 'କଦଳୀ') returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 dozen', 6000, 0, true);
  insert into products (category_id, name_en, name_or) values (4, 'Camphor', 'କର୍ପୂର') returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 packet', 3000, 0, true);
  insert into products (category_id, name_en, name_or) values (5, 'Notebook (200 pages)', 'ଖାତା') returning id into p;
  insert into product_sizes (product_id, label, price_paise, sort_order, is_default) values (p, '1 piece', 4000, 0, true);
end $$;

update shop_settings set address = '[Test address]', phone = '9000000000', timings = '7 AM to 9 PM' where id = 1;
