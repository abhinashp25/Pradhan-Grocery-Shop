# Backend (database, rules and login functions)

Supabase: PostgreSQL database, login, photo storage, and small server functions.

- `supabase/migrations/001_core.sql` tables, locks, rules, functions (run first)
- `supabase/migrations/002_storage.sql` photo folders (run second)
- `supabase/functions/` customer login with PIN lock, create customer, reset PIN, unlock
- `supabase/first_owner.sql.example` how to make the first owner account
- `supabase/seed_test_only.sql` sample products. TEST PROJECT ONLY.
- `tests/credit_rules.sql` checks of the credit book, lists and access rules. Run on the test project.

Run the Supabase commands from this `backend` folder. See the main README for the steps.
