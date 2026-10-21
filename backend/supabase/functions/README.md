# Edge Functions

Small server programs that need a secret key. The app never holds that key.

| Function | Who can call it | What it does |
|---|---|---|
| `customer-login` | anyone (no sign-in yet) | Checks phone + PIN, counts wrong tries, locks for 15 minutes after 5 |
| `admin-create-customer` | owner only | Creates the login, profile and credit account |
| `reset-pin` | owner only | Sets a new PIN and clears any lock |
| `unlock-customer` | owner only | Clears the lock |

## Setup

1. Make a long random secret (at least 32 characters) and save it:
   `supabase secrets set PIN_PEPPER=<your secret> ALLOWED_ORIGIN=https://<your site>`
   Keep a copy on paper. **If this secret is lost or changed, every customer PIN stops working** and each PIN has to be reset.
2. Deploy:
   - `supabase functions deploy customer-login --no-verify-jwt`
   - `supabase functions deploy admin-create-customer`
   - `supabase functions deploy reset-pin`
   - `supabase functions deploy unlock-customer`
3. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are added by Supabase itself.

## Replies

Functions send a short `code` (for example `wrong_pin`, `locked`, `phone_taken`). The app turns each code into a sentence in the customer's language. A wrong PIN also sends `triesLeft`. A lock sends `minutesLeft`.
