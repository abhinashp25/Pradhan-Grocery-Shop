# Pradhan Grocery Store: project guide for the AI assistant

Read this whole file before you change anything. After reading, tell me in your own words what the app does and which files you will NOT touch. Then wait.

## 1. What this app is

A phone app (PWA) for one village grocery shop in Odisha, India. Customers look at items and prices, make a list, send the list to the shop, call the shop, and then come and collect the goods in the shop. The owner also keeps a private credit book (udhaar) for regular customers.

It is **store-only**. There is **no cart, no checkout, no online payment, no delivery**. The main button says "Add to My List", never "Add to Cart". Never add any of these, even if it seems like a good idea.

Users:
- **Visitor** (no login): browse, search, make a list, send it with a name and phone number.
- **Customer** (phone number + 4-digit PIN): also sees their own credit book (read only) and saved lists. The owner creates the account in the shop. There is no sign-up screen.
- **Owner** (email + password + two-step code): everything under `/owner`.

Many customers are old or cannot read well. Big buttons, pictures with words, Odia first (then Hindi, then English), simple sentences.

## 2. The 9 shop pages

Grocery (the main page, always first and biggest), Vegetables, All Fruits, Puja Samagri, Books and Pens, Kids and Candy, Colours and Festival, Beauty and Personal Care, and Xerox and Print (a rates page, not a product page).
The 8 product pages share one screen file (`frontend/src/pages/Category.tsx`, route `/c/:slug`). Their names, colours and order come from the `categories` table.

## 3. Folder map

```
pradhan-grocery/
  frontend/                  the app (React 18, TypeScript, Vite 5, Tailwind 3)
    src/
      main.tsx               starts the app, theme, QR visit count
      App.tsx                splits /owner/* from everything else
      CustomerApp.tsx        customer shell and all customer routes
      OwnerApp.tsx           owner shell and all owner routes
      lib/                   shared logic (no screens)
        supabase.ts          the Supabase client (needs .env)
        api.ts               all customer database reads
        auth.tsx             who is logged in (AuthProvider, useAuth)
        functions.ts         calls to the Edge Functions (login, owner actions)
        lang.ts, myList.ts, savedLists.ts, money.ts, time.ts, theme.ts,
        csv.ts, image.ts, useLoad.ts, useTitle.ts, visits.ts, types.ts
      components/            small pieces: ui.tsx (buttons, Field, Modal, Notice, Switch),
                             Header, BottomBar, Footer, CallPill, ProductCard, StatusTag,
                             PinPad, AudioHelp, Chrome.tsx (progress bar, back to top,
                             cookie notice, copy button), Guards, OwnerLayout, icons, Skeleton, LoadError
      pages/                 customer screens
      pages/owner/           owner screens
      locales/               en.json (complete), or.json (Odia, almost empty), hi.json (Hindi, almost empty)
    public/                  icons, favicon, _redirects, audio/ (Odia clips, not recorded yet)
  backend/
    supabase/migrations/     001_core.sql (database), 002_storage.sql (photo folders)
    supabase/functions/      customer-login, admin-create-customer, reset-pin, unlock-customer, _shared
    supabase/seed_test_only.sql   sample data, TEST project only
    tests/credit_rules.sql   62 checks; the last result must say ALL PASSED
  .github/workflows/keep-alive.yml
```

## 4. How the app flows

Customer:
1. First open: `/welcome` (choose language, 3 picture slides) then `/`.
2. Home: banner, big Grocery card, other category tiles, Xerox tile, Popular in Grocery, Today's Fresh.
3. `/c/:slug` category page: category chips, sub-group chips, "only available" switch, product cards. Fruits and Vegetables show a "Today's rate" note.
4. `/p/:id` product detail: choose size, Add to My List.
5. `/search`: search in Odia, Hindi, English (database function `search_products`); words with no result are counted (`log_search_miss`).
6. `/list` My List (kept on the phone): quantities, estimated total, **Send List to Shop** (database function `send_list`), call the shop, Show at Counter, WhatsApp, copy, print, Save list (logged in).
7. `/login` phone + PIN through the Edge Function `customer-login`. `/account`, `/saved`, `/credit` (balance from `get_my_balance`, lines from `credit_entries`).
8. `/shop-info`, `/help`, `/xerox`, 404.

Owner (`/owner/login` then everything under `/owner`):
- Sent Lists: see lists customers sent, call them, Mark Ready, Mark Collected.
- Credit: list of balances, then one customer: Add Credit, Add Payment, Mark All Cleared, Add Correction (all through database functions, each with a confirm popup), WhatsApp reminder, show-balance switch, Reset PIN, Unlock.
- Customers (create through `admin-create-customer`), Products (availability switch, filters), Add/Edit product (photo shrunk to WebP under 100 KB), Today's Rates, Bulk CSV upload, Shop settings and banner and Xerox rates, Backup and export (CSV), Activity log, Two-step code setup.

Data rules in one place:
- Customer screens only READ tables. Their only writes go through database functions (`send_list`, `log_search_miss`, `log_visit`) or their own saved lists.
- All credit changes go ONLY through `add_credit_entry` and `mark_all_cleared`. The `credit_entries` table has no insert, update or delete permission from the app.
- PINs are handled only by the Edge Functions. The frontend never sees the service key.

## 5. Rules that must never be broken

Business rules:
1. Credit lines are written once and never edited or deleted. A mistake is fixed with a Correction line that has a reason and points to the old line.
2. The pending amount is always calculated from the lines. It is never typed in or stored by hand.
3. Money is whole **paise** (Rs 125.50 = 12550) everywhere. Use `formatRupees` in `lib/money.ts`.
4. Dates and times are always shown in Indian time, 12-hour with AM or PM, like `18 Oct 2026 · 4:35 PM`. Use `lib/time.ts`. Never use the phone's own time zone.
5. The owner types each customer's PIN. A saved PIN can never be shown again, only replaced.
6. Customers only ever see their own data. A hidden balance must show "ask in the shop", never "all clear".

Code rules:
7. Do not put the `service_role` key, `PIN_PEPPER`, or any secret in `frontend/` or in Git. `.env` is never committed.
8. Do not edit any migration that has already been run (001 to 009). Every database change is a NEW numbered file (`010_...sql` next). It must also give the table its permissions (GRANT) in the same file, because on this Supabase project a new table starts with NO permissions for the app, and the owner screens fail with "permission denied". Add a check for it in `backend/tests/owner_access.sql` (and `credit_rules.sql` if it touches credit or lists).
8b. Access has two layers: GRANTs (can this role touch the table at all) and RLS policies (which rows). Both must be right. `006_grants.sql` is the list of who may read or write what.
8c. The server functions use the secret service key (role `service_role`). It needs permission on every table too (`008` gives it, including for future tables). Internal helper functions (`credit_pending`, `credit_oldest_unpaid`, `write_audit`) must stay locked: the app roles may not call them. Do not turn them into views the app reads, because a view calls functions with the app's rights.
8d. Credit age is the date of the oldest credit that is not fully paid (payments count against the oldest credit first). It is worked out by `credit_oldest_unpaid` and shown through `credit_aging()` (owner) and `get_my_credit_age()` (customer). Never store it by hand.
8e. The owner's's two-step code is enforced by the database (`is_admin()` in `007_hardening.sql`), not only by the login screen. Never weaken it.
9. Do not rename tables, columns, routes or translation keys without being asked.
10. Do not add packages without asking. Never run `npm audit fix --force`. Do not change versions in `package.json`.
11. All customer screen text lives in `frontend/src/locales/*.json`. No text typed inside components. English is the fallback for missing Odia or Hindi keys. Owner screens are English only.
12. Every new screen needs: its own `useTitle(...)`, loading placeholders (`Skeleton`), an error with a retry (`LoadError`), an empty-state sentence, and success and error messages.

Look and style rules (these are deliberate, do not "improve" them):
- Colours only from `tailwind.config.js`: saffron, forest, leaf, brick, plus the page, card, ink, muted, line variables (they swap in dark mode).
- Saffron buttons use brown text, never white.
- Fonts: Baloo Bhaina 2 (headings), Noto Sans and Noto Sans Oriya (body). No Inter, no Space Grotesk, no serif italics.
- Icons: our own small SVGs in `components/icons.tsx`. No Lucide, no icon libraries, no shadcn.
- No purple-blue gradients, gradient headline text, glassmorphism, grain, cursor-following lines, fade-on-hover buttons, badges above headlines, three-icon-box rows, coloured left-border cards, emojis in headings.
- Motion uses GSAP only, and only through `frontend/src/lib/motion.ts` (tilt, scroll reveal) and the hero in `components/Hero.tsx`. Rules: every effect is skipped when the phone asks for reduced motion; tilt only on screens with a mouse; items that animate in are already on the page when it first draws (never content that loads later); animate only transform and opacity; keep each animation under about 1 second; no motion on forms, the credit book or owner screens.
- Loading: every screen shows a page-shaped skeleton (`components/Skeletons.tsx`) with a moving light, never a blank page or a spinner on top of content. `index.html` also shows a skeleton before the app has downloaded. Every page except Home has a Back button (`components/BackButton.tsx`) and owner pages go back to `/owner`. The owner always has an "Owner dashboard" link in the shop header.
- Colours made from the light and dark variables are stored as three numbers (`--page: 255 248 236`) so opacity classes like `bg-line/40` work. Keep that form.
- Layout is responsive: phone first (bottom bar), laptop from the `lg` size (header links, wider grids, owner side menu). Check both widths after every change to a screen.
- No em dashes in any app text. Use a full stop, a comma or a colon.
- Plain shop words only. No buzzwords.
- Spacing only from Tailwind steps 1, 2, 3, 4, 6, 8, 12. Buttons at least 56 px tall (48 px inside product cards). Body text at least 18 px.
- Code style: one purpose per file, names say what they do, short comments that say WHY, no debug logs, no commented-out code, no unused files.

## 6. What is built and what is not

Built and checked (type-check, build, and the database tests `credit_rules.sql` and `owner_access.sql` pass with no default permissions): everything in section 4, plus the items the owner added with Antigravity: Odia and Hindi text (a first draft), customer login status on the Customers list, hiding and purging old sent lists, shop photos, quick edits on owner screens.

Added in the audit: explicit permissions (006), the two-step code enforced in the database (007), server-key permissions and photo rules (008), credit age and the reminder days (009), a laptop layout, a new Home with a GSAP hero, category heroes, page-shaped skeleton loading, Back buttons, offline bar, page changes, and card tilt.

NOT done yet, in priority order:
1. A native Odia reader must check `or.json` and `hi.json`. They are AI drafts.
2. The new look is built on Home, the shell (header, footer, owner side menu) and product cards only. Other screens keep their phone design and only get the wider laptop layout.
3. Odia help audio files in `frontend/public/audio/` (see its README). The Listen button already exists.
4. Optional "Suggest Odia" helper (new Edge Function `suggest-odia`, needs a paid translation key).
5. Automated tests for the frontend. Nothing has been tested on a real phone by the assistant.
6. GSAP adds about 70 KB (compressed) to the first download. If slow phones struggle, load GSAP only on Home.
7. Version 2 only: helper accounts, per-size availability, barcode scan, monthly credit PDF.

Not verified: real Android phones, real Supabase behaviour of the two-step code in `supabase-js` (check the owner login with and without a code set up), Odia voice search.

## 7. How to work

- Work in small steps. Before you start a step, list the files you will create or change.
- After each step: `cd frontend` then `npm run build`. It must pass with no errors.
- Backend changes: new numbered migration plus a new test in `backend/tests/credit_rules.sql`.
- If something in this file and the code disagree, stop and ask me. Do not guess.
- When unsure, make the smallest safe change and tell me.
