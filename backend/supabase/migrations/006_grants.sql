-- Migration 006: explicit table permissions.
--
-- Why this exists: on this Supabase project, new tables start with NO permissions for the
-- app roles, and 001 only gave some of them back. The owner could read everything but could
-- not add or change products, prices, settings, banners, Xerox rates or sub-groups
-- ("permission denied for table products").
--
-- Two layers protect the data: these grants (can this role touch the table at all) and the
-- row rules (RLS) from 001 (which rows). Here every permission is written out, so nothing
-- depends on Supabase defaults. It is safe to run more than once.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Shop data: everyone may read it.
grant select on categories, subcategories, products, product_sizes,
                banners, shop_settings, services, shop_photos to anon, authenticated;

-- Logged-in customers: their own lists, sent lists, profile, credit account and credit lines.
-- (Row rules limit each customer to their own rows. Sent lists and credit lines
-- are written only by the database functions, never directly.)
grant select on profiles, shopping_lists, shopping_list_items,
                sent_lists, sent_list_items, credit_accounts, credit_entries to authenticated;
grant insert, update, delete on shopping_lists, shopping_list_items to authenticated;

-- Owner screens. The row rules allow these writes only when is_admin() is true.
grant insert, update, delete on products, product_sizes, subcategories, categories,
                                banners, services, shop_photos to authenticated;
grant update on shop_settings   to authenticated;
grant update on credit_accounts to authenticated;   -- the "show balance" switch
grant select on audit_log, search_misses, visit_sources to authenticated;
grant select on credit_balances, customer_status to authenticated;

-- Serial numbers (sub-groups, banners, Xerox services, photos) need their counters.
grant usage, select on all sequences in schema public to authenticated;

-- login_attempts: no grants on purpose. Only the login Edge Function (service key) uses it.
