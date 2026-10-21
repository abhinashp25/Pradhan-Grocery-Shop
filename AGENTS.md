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
8. Do not edit `001_core.sql` or `002_storage.sql` after they have been run. Every database change is a NEW numbered file (`003_...sql`, `004_...sql`), and `backend/tests/credit_rules.sql` is updated to cover it.
9. Do not rename tables, columns, routes or translation keys without being asked.
10. Do not add packages without asking. Never run `npm audit fix --force`. Do not change versions in `package.json`.
11. All customer screen text lives in `frontend/src/locales/*.json`. No text typed inside components. English is the fallback for missing Odia or Hindi keys. Owner screens are English only.
12. Every new screen needs: its own `useTitle(...)`, loading placeholders (`Skeleton`), an error with a retry (`LoadError`), an empty-state sentence, and success and error messages.

Look and style rules (these are deliberate, do not "improve" them):
- Colours only from `tailwind.config.js`: saffron, forest, leaf, brick, plus the page, card, ink, muted, line variables (they swap in dark mode).
- Saffron buttons use brown text, never white.
- Fonts: Baloo Bhaina 2 (headings), Noto Sans and Noto Sans Oriya (body). No Inter, no Space Grotesk, no serif italics.
- Icons: our own small SVGs in `components/icons.tsx`. No Lucide, no icon libraries, no shadcn.
- No purple-blue gradients, gradient headline text, glassmorphism, grain, cursor effects, fade-in on scroll, fade-on-hover buttons, badges above headlines, three-icon-box rows, coloured left-border cards, emojis in headings.
- No em dashes in any app text. Use a full stop, a comma or a colon.
- Plain shop words only. No buzzwords.
- Spacing only from Tailwind steps 1, 2, 3, 4, 6, 8, 12. Buttons at least 56 px tall (48 px inside product cards). Body text at least 18 px.
- Code style: one purpose per file, names say what they do, short comments that say WHY, no debug logs, no commented-out code, no unused files.

## 6. What is built and what is not

Built and checked (type-check, build, and 62 database checks pass): everything in section 4.

NOT built yet, in priority order:
1. `frontend/src/locales/or.json` and `hi.json` are almost empty. Most screens show English.
2. Quick price edit on each row of `pages/owner/Products.tsx`.
3. Owner Customers list: last login and locked or not (needs a new migration, an owner-only view).
4. Old sent lists: hide after 7 days, delete after 30 (needs a new migration with a purge function).
5. Shop photos on `pages/ShopInfo.tsx` (owner upload in Settings; bucket `banners` already exists).
6. Odia help audio files in `frontend/public/audio/` (see its README). The Listen button already exists.
7. Owner-only "Suggest Odia" helper (new Edge Function `suggest-odia`, needs a paid translation key). Optional.
8. Version 2 only: helper accounts, per-size availability, barcode scan, monthly credit PDF.

Not verified: nothing has been tested on a real Android phone or against a live Supabase project except by the user. Odia voice search is unverified.

## 7. How to work

- Work in small steps. Before you start a step, list the files you will create or change.
- After each step: `cd frontend` then `npm run build`. It must pass with no errors.
- Backend changes: new numbered migration plus a new test in `backend/tests/credit_rules.sql`.
- If something in this file and the code disagree, stop and ask me. Do not guess.
- When unsure, make the smallest safe change and tell me.
