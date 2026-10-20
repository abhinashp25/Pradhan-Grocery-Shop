# Pradhan Grocery Store: full app

A phone app (PWA) that shows what the shop has and the price. Customers make a list, send it to the shop, then come and collect it. The owner keeps a safe credit book. No online payment. No delivery.

    pradhan-grocery/
      frontend/   the app (React, TypeScript, Vite, Tailwind)
      backend/    database, rules, login functions, tests (Supabase)
      .github/    a free job that keeps the database awake

## 1. Install on your computer (once)

- Node.js LTS (version 20 or newer; this was built and checked with 22) from nodejs.org. It brings npm.
- Git (git-scm.com) and a GitHub account.
- A Supabase account (supabase.com) and a Cloudflare account (cloudflare.com).
- The Supabase command line tool. You do not install it globally: use `npx supabase ...`.

## 2. Packages (npm installs them for you)

Run `cd frontend` then `npm install`. This installs:

- App: `react`, `react-dom`, `react-router-dom` (screens and links)
- Backend link: `@supabase/supabase-js` (talks to Supabase)
- Fonts (self-hosted): `@fontsource/baloo-bhaina-2`, `@fontsource/noto-sans`, `@fontsource/noto-sans-oriya`
- Build tools: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`
- Styling: `tailwindcss` (version 3), `postcss`, `autoprefixer`
- Offline and install-to-phone: `vite-plugin-pwa`

The login functions use Deno packages that Supabase fetches by itself. You install nothing for them.

## 3. Connect Supabase (use a TEST project first; repeat later for the live one)

1. supabase.com, New project. Name it, set a strong database password (write it on paper), choose the **Mumbai** region.
2. Project settings, API: copy the **Project URL** and the **anon public key**.
   Never put the `service_role` key in the frontend or in Git.
3. `cd frontend`, copy `.env.example` to `.env`, and fill in:
       VITE_SUPABASE_URL=<Project URL>
       VITE_SUPABASE_ANON_KEY=<anon public key>
4. SQL editor: run `backend/supabase/migrations/001_core.sql`, then `002_storage.sql`. On the TEST project only, also run `backend/supabase/seed_test_only.sql`.
5. Authentication settings (names may differ a little): turn **off** new user sign-ups (customers are made only by the owner). Set the **Site URL** to your site address. Make sure two-step codes (TOTP) are enabled.
6. Make the first owner: follow `backend/supabase/first_owner.sql.example`.
7. Login functions, from the `backend` folder:
       cd backend
       npx supabase login
       npx supabase init                      (once; creates the config file)
       npx supabase link --project-ref <your project reference>
       npx supabase secrets set PIN_PEPPER=<random text, 32+ characters> ALLOWED_ORIGIN=<your site address>
       npx supabase functions deploy customer-login --no-verify-jwt
       npx supabase functions deploy admin-create-customer
       npx supabase functions deploy reset-pin
       npx supabase functions deploy unlock-customer
   Keep `PIN_PEPPER` on paper. If it is lost or changed, every customer PIN stops working.
8. Run the tests: paste `backend/tests/credit_rules.sql` into the SQL editor of the TEST project. The last result must say ALL PASSED.
9. Start the app: `cd frontend`, `npm run dev`. Open `/owner/login`, log in, then More, Two-step code.

## 4. Put it online (Cloudflare Pages)

- Push the project to a private GitHub repository.
- Cloudflare, Workers and Pages, create a Pages project from that repository.
- Root directory `frontend`, build command `npm run build`, output directory `dist`.
- Add the same two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- In GitHub, repository settings, secrets: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the keep-alive job.

## 5. Odia text: where each kind goes

- **Screen text** (buttons, messages): `frontend/src/locales/or.json`. Add every key that is in `en.json`. Any key left out shows in English. Have a native Odia reader check the whole file. Hindi is `hi.json`.
- **Product names**: typed by the owner in Owner, Add or edit product, field "Name in Odia" (or the `name_or` column in the bulk upload). They are stored in the database column `products.name_or`.
- **Odia help audio**: record the clips listed in `frontend/public/audio/README.md`.
- **Automatic ("real time") translation**: not built, and not recommended for customer screens, because machine Odia is often wrong. If you want help writing Odia names, add an owner-only "Suggest Odia" button:
  - a new function `backend/supabase/functions/suggest-odia/index.ts` that calls a translation service (for example Google Cloud Translation, which supports Odia, and is paid after a free amount; check current prices). Keep its key with `npx supabase secrets set TRANSLATE_API_KEY=...`, never in the frontend.
  - a button next to the Odia name field in `frontend/src/pages/owner/ProductEdit.tsx` that calls it through `callOwnerFunction` (in `frontend/src/lib/functions.ts`) and fills the field, so the owner reads and fixes it before saving.

## 6. Before real customers

- All tests pass on the test project, and you clicked through every screen on a real Android phone.
- Real shop details are entered (Owner, More, Shop settings), including Xerox rates.
- Top 200 items are loaded (Owner, More, Bulk upload), with photos for the top 50.
- Odia text is checked by a native reader.
- The live database has no test data. Weekly credit export is a habit. The paper notebook runs side by side for at least 2 months.
