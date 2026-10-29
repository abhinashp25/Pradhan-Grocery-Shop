-- Removes duplicate products (same English name, ignoring capital letters), keeping the oldest one.
-- A product that is already in a customer's list or a sent list is never removed.
-- Run once in the SQL editor. The last result shows how many products are left.
with ranked as (
  select id, row_number() over (partition by lower(name_en) order by created_at, id) as n
  from products
)
delete from products
where id in (select id from ranked where n > 1)
  and id not in (select product_id from sent_list_items where product_id is not null)
  and id not in (select s.product_id from product_sizes s join shopping_list_items i on i.product_size_id = s.id);

select count(*) as products_left from products;
