# Pradhan Grocery: Antigravity Prompt Playbook

> **How to use this file**
> Paste one prompt at a time into the Antigravity chat, in order.
> After EVERY prompt, run the verification checklist below before moving on.
> Never paste the next prompt before the current one fully passes.

---

## Verification Checklist (run after EVERY prompt)

```
VERIFY BEFORE MOVING ON:
1. cd frontend && npm run build        → must show 0 errors, 0 warnings
2. Open the changed screen at 320 px width in the browser → no horizontal scroll
3. Every button >= 56 px tall (48 px inside product cards)
4. Body text >= 18 px
5. Browser console → 0 errors
6. git diff --stat → only the files the AI listed should be changed
7. git add -p && git commit -m "..."   → commit only when all above pass
```

> **Red lines.** If the AI mentions cart, checkout, online payment, delivery,
> sign-up screen, editing a credit line, deleting a credit line, the
> service_role key in frontend/, or any secret in Git — stop immediately,
> do NOT commit, and correct the AI.

---

## Prompt 0: Orient the AI (always first, and at the start of every new chat)

> **Purpose.** Give the AI a complete mental model of the app before any code
> changes. A well-oriented AI makes fewer mistakes and asks fewer questions.

```
Read these files completely, in this order, before doing anything else:
  1. AGENTS.md (project root)
  2. frontend/README.md
  3. backend/README.md (if it exists)
  4. frontend/src/CustomerApp.tsx
  5. frontend/src/OwnerApp.tsx
  6. frontend/src/lib/api.ts
  7. frontend/src/lib/functions.ts
  8. frontend/src/lib/types.ts
  9. frontend/src/lib/money.ts
  10. frontend/src/lib/time.ts
  11. backend/supabase/migrations/001_core.sql

Do NOT change any file.

Then answer in plain English:
  a) What does this app do? (5 lines, no buzzwords)
  b) Walk through the full customer journey: first open → browse → list → send → collect.
  c) Walk through the owner credit flow. Which database functions are called and
     why can nobody edit or delete a credit line?
  d) List the 10 rules from AGENTS.md you must never break. Quote each one exactly.
  e) List every file you will NOT touch unless I explicitly ask.
  f) List every feature that is not yet built (section 6 of AGENTS.md).
  g) What currencies and number formats does the app use? How is money stored?
  h) How are dates and times shown? Which file handles that?

Stop and wait for my next instruction.
```

**After reading the AI answer:** If it mentions cart, payment, delivery, sign-up,
or says credit lines can be edited or deleted, reply:
"Read AGENTS.md again, section 5, and correct your answer."
Do not continue until the answer is correct.

---

## Prompt 1: Health Check (no code changes)

> **Purpose.** Establish a clean baseline before touching anything.

```
Do not change any file. Run all checks and report findings only.

1. BUILD
   cd frontend && npm run build
   Show the full output. Note every error and warning.

2. PACKAGES
   Compare frontend/package.json against all imports in every .ts and .tsx file.
   List:
   - Packages installed but never imported anywhere.
   - Imports in code that have no matching package.json entry.

3. DEAD FILES
   List every file in frontend/src/ that is not imported (directly or indirectly)
   by main.tsx or any route in CustomerApp.tsx or OwnerApp.tsx.

4. MISSING TRANSLATION KEYS
   List every key used as t("...") or useText("...") in frontend/src/ that does
   not exist in frontend/src/locales/en.json.

5. SECURITY SCAN
   Search the entire frontend/ folder for these strings (case-insensitive):
   service_role, PIN_PEPPER, supabase_service, SUPABASE_SERVICE.
   Report every file and line number that matches.

6. SCREEN AUDIT (YES / NO for each)
   For every file in frontend/src/pages/ and frontend/src/pages/owner/:
   - useTitle() called
   - Loading skeleton shown
   - Error state with retry button
   - Empty-state message
   - All buttons >= 48 px tall

Report only. Fix nothing.
```

---

## Prompt 2: Fill Odia and Hindi Translations (draft)

> **Purpose.** Give every screen real Odia and Hindi text so the app is usable
> for local customers. A native speaker must review before real customers see it.

```
Task: complete the translation files.

Files you may change:
  - frontend/src/locales/or.json
  - frontend/src/locales/hi.json
  - frontend/src/locales/REVIEW.md  (create this file)

Rules:
  - Add every key that exists in en.json to both files. Alphabetical order.
  - Keep key names identical to en.json. Do not add or remove keys.
  - Keep every placeholder exactly as-is: {count} {name} {phone} {date} {time} {spot}.
  - Use simple spoken words a village shopkeeper and old customers would say.
    Short sentences. No long formal words. No literary Odia. No formal Hindi.
  - No em dashes. No English words where an Odia or Hindi word exists.
  - Keep the shop name, rupee symbol, and all numbers unchanged.
  - Do not touch en.json.
  - In REVIEW.md, list every key you were uncertain about with the reason,
    so a native reader can check them before launch.

Then: cd frontend && npm run build. Show the result.
Report: how many keys were already translated vs. newly added.
```

> **After this prompt:** Send REVIEW.md to a native Odia speaker before going live.

---

## Prompt 3: Quick Price Edit on Owner Products List

> **Purpose.** Let the owner fix a price with one tap, without opening the full
> product edit page.

```
Task: add inline price editing to the owner Products list.

File you may change: frontend/src/pages/owner/Products.tsx only.

Behaviour:
  - Each row shows the price of the default size (is_default = true), or the
    first size if none is marked default.
  - A small "Edit Price" button (minimum 48 px tall) next to the price opens
    a Modal from components/ui.tsx.
  - The Modal shows: product name, size name, current price in rupees (2 dp).
  - One Field (from components/ui.tsx) accepts the new price in rupees.
  - Validation: must be a positive number, max 2 decimal places, max 99999.99.
    Show an error Notice for any violation. Do not call the database on failure.
  - On save: convert to paise with Math.round(rupees * 100), then update
    product_sizes.price_paise for that size only.
  - Show a success Notice, then refresh the product list.
  - Keep every existing feature working: search, filters, availability switch.
  - Do not add any new package.

Run: cd frontend && npm run build. Show the full output.
```

---

## Prompt 4: Customer List Shows Last Login and Locked Status

> **Purpose.** Help the owner see at a glance who is locked out and when each
> customer last used the app.

```
Task: show "last login" and "locked" on the owner Customers list.

Step 1 - Backend (create a new migration; never edit 001 or 002):
  File: backend/supabase/migrations/003_customer_status.sql
  - Create a view customer_status with columns:
      customer_id     uuid
      full_name       text
      phone           text
      last_sign_in_at timestamptz   (from auth.users)
      locked_until    timestamptz   (from login_attempts; null if not locked)
  - Row-level security: the view must return rows only when is_admin() is true.
    Use the same pattern as the credit_balances view in 001_core.sql.
  - Grant select to authenticated.
  Show me the full SQL before you continue to Step 2.

Step 2 - Tests (append to backend/tests/credit_rules.sql, before the final
  "-- ALL PASSED" comment):
  - Owner can select from customer_status and gets at least one row.
  - A customer JWT gets zero rows.
  - An anonymous request gets zero rows.

Step 3 - Frontend:
  File: frontend/src/pages/owner/Customers.tsx only.
  - Read the customer_status view via the Supabase client.
  - Show "Last login: 18 Oct 2026 · 4:35 PM" (use lib/time.ts) or "Never".
  - When locked_until is in the future: show a red "Locked" label and an
    Unlock button that calls callOwnerFunction("unlock-customer", { customerId }).
  - Keep every existing feature working.

Run: cd frontend && npm run build. Show the full output.
List every file you changed.
```

---

## Prompt 5: Auto-Purge Old Sent Lists

> **Purpose.** Prevent the sent_lists table from growing without limit.

```
Task: hide lists older than 7 days from the owner view; delete them after 30 days.

Step 1 - Backend (new migration only):
  File: backend/supabase/migrations/004_purge_sent_lists.sql
  - Create function purge_old_sent_lists():
      SECURITY DEFINER
      SET search_path = public
      Delete sent_list_items rows for lists older than 30 days first (FK order).
      Then delete sent_lists rows older than 30 days.
      Raise an exception if is_admin() is false.
      Return the count of lists deleted as an integer.
  Show me the full SQL before you continue.

Step 2 - Tests (append to backend/tests/credit_rules.sql):
  - Owner can call purge_old_sent_lists() without error.
  - A customer calling the function gets an exception.

Step 3 - Frontend:
  - frontend/src/pages/owner/SentLists.tsx: add .gte("created_at", sevenDaysAgo)
    to the existing query. Show a note "Lists older than 7 days are hidden."
  - frontend/src/pages/owner/Dashboard.tsx: call purge_old_sent_lists() via
    supabase.rpc() once on component mount. On error, console.warn only.

Do not change any other file.
Run: cd frontend && npm run build. Show the full output.
```

---

## Prompt 6: Shop Photos on the Shop Info Page

> **Purpose.** Show up to 3 real photos of the shop so new customers can
> recognise the building before visiting for the first time.

```
Task: let the owner upload up to 3 shop photos; display them on ShopInfo.

Step 1 - Backend:
  File: backend/supabase/migrations/005_shop_photos.sql
  - ALTER TABLE shop_settings
      ADD COLUMN photo_paths text[] NOT NULL DEFAULT '{}';
  - Do not edit 001 or 002.
  Show me the full SQL before you continue.

Step 2 - Types and API (only these two files):
  - frontend/src/lib/types.ts: add photo_paths: string[] to the Shop type.
  - frontend/src/lib/api.ts: add photo_paths to the fetchShop select list.

Step 3 - Owner Settings:
  File: frontend/src/pages/owner/Settings.tsx
  - Add a "Shop Photos" section with a file input (accept="image/*").
  - Use compressPhoto from lib/image.ts to reduce each photo to WebP < 100 KB.
  - Upload each to the existing "banners" storage bucket under the path shop/{filename}.
  - Store the resulting public URL in the photo_paths array (maximum 3 items).
  - Render each current photo with a Remove button.
  - Show success and error messages using Notice from components/ui.tsx.

Step 4 - Customer ShopInfo:
  File: frontend/src/pages/ShopInfo.tsx
  - Render each URL in photo_paths as:
      <img src={url} alt="Pradhan Grocery shop photo"
           width={600} height={400} loading="lazy" />
  - If photo_paths is empty, render nothing (no placeholder box).

Run: cd frontend && npm run build. Show the full output.
List every file you changed.
```

---

## Prompt 7: Full Pre-Launch Audit (report only, no changes)

> **Purpose.** Find every gap before the app goes live.

```
Do not change any file.

Part A - Feature completeness:
  For every item in AGENTS.md section 4 (customer flow) and section 5 (rules),
  answer:
    DONE   - file(s) that implement it
    PARTLY - what works, what is missing
    NOT DONE - no implementation found

Part B - Screen quality audit:
  For every file in frontend/src/pages/ and frontend/src/pages/owner/ answer
  YES or NO for each:
    - useTitle() called
    - Loading skeleton rendered while data loads
    - Error state with a visible retry button
    - Empty-state message when the list is empty
    - No horizontal scroll at 320 px viewport width
    - All interactive elements have unique id attributes
    - All buttons >= 48 px tall (56 px for primary actions)
    - Body text >= 18 px
    - No console.log in production code
    - No commented-out code blocks
    - No unused imports

Format as a table: Item | Status | File / Notes.
Do not fix anything. List what I should prioritise first.
```

---

## Prompt 8: Fix Audit Gaps

> **Purpose.** Systematically close every PARTLY or NOT DONE from Prompt 7.

```
Using the audit table from the previous message, fix every PARTLY and NOT DONE
item. Work in this order:
  1. Screens missing useTitle / Skeleton / LoadError / empty-state message.
  2. Buttons below the minimum height.
  3. Text below 18 px.
  4. console.log calls or commented-out code in production files.
  5. Unused imports.

For each fix:
  - State the file name and the exact lines changed.
  - Explain why the change is the minimal safe fix.

Strict limits:
  - Do not change anything already marked DONE.
  - Do not add new packages.
  - Do not rename translation keys, routes, tables, or columns.
  - Do not alter the visual design, colours, or spacing of any screen.

Run: cd frontend && npm run build. Show the full output.
List every file changed.
```

---

## Prompt 9: Wire Odia Help Audio (run after audio files are recorded)

> **Purpose.** Enable the Listen button with real Odia audio clips.
> Run this only after the recordings in frontend/public/audio/ are ready.

```
Task: connect the recorded Odia audio clips to the AudioHelp component.

Step 1: Read frontend/src/components/AudioHelp.tsx completely.
Step 2: Read frontend/public/audio/README.md for the file naming convention.
Step 3: Update AudioHelp to load and play the correct clip for each screen.
  Use a plain HTML <audio> element. Do not add any new package.
Step 4: Show the Listen button only when the active language is Odia.
  Do not show it for English or Hindi until clips exist for those languages.

Do not change any other file.
Run: cd frontend && npm run build. Show the full output.
```

---

## Prompt 10 (Optional, needs paid API key): Suggest-Odia Owner Helper

> **Purpose.** Help the owner add Odia product names without having to type them
> from scratch. This prompt is entirely optional.

```
Task: add an owner-only "Suggest Odia" button on the product edit page.
The button suggests text only. The owner must read and save it manually.

Step 1 - Edge Function:
  File: backend/supabase/functions/suggest-odia/index.ts
  - Import requireOwner from _shared/accounts.ts. Reject non-owner requests with 403.
  - Read { text: string } from the JSON body.
  - Validate: non-empty string, maximum 200 characters. Reject anything else with 400.
  - Call the translation API using Deno.env.get("TRANSLATE_API_KEY").
    Never hard-code the key. Never log the input text.
  - Return { suggestion: string }.

Step 2 - Frontend:
  File: frontend/src/pages/owner/ProductEdit.tsx only.
  - Add a small "Suggest Odia" button (minimum 48 px tall) beside the Odia name field.
  - On click: call callOwnerFunction("suggest-odia", { text: englishName }).
  - Put the result into the Odia name field.
  - Show a yellow Notice: "Please read and correct this before saving."
  - Show an error Notice if the call fails.
  - Do not show this button or call this function on any customer screen.

Step 3 - Docs:
  File: backend/supabase/functions/README.md
  - Add: TRANSLATE_API_KEY — required only for the suggest-odia function.

Do not call any translation service from frontend code.
Run: cd frontend && npm run build. Show the full output.
```

---

## Emergency Rollback

If a prompt breaks the build and the AI cannot fix it in one reply:

```
Stop all changes. Do not add more code.

1. Show me the exact build error (full text, not summarised).
2. Show me git diff for every file you changed.
3. Which single change most likely caused the break?

Do not guess or try random fixes. Wait for my instruction.
```

Revert to the last good commit if needed:

```bash
# Discard all unstaged changes in frontend/src:
git checkout -- frontend/src

# Or stash all changes to get back to a clean state:
git stash
```

---

## Standing Rules (apply to every prompt in this file)

| Rule | What to check |
|------|---------------|
| No new packages | package.json must not change |
| No secrets in frontend/ | grep for service_role, PIN_PEPPER |
| New DB change = new migration file | Never edit 001_core.sql or 002_storage.sql |
| Credit lines are immutable | No INSERT/UPDATE/DELETE on credit_entries from frontend |
| Money is whole paise | Always Math.round(rupees * 100) |
| Time in Indian timezone | Always use lib/time.ts, never new Date().toLocaleString() |
| All text in locales only | No string literals inside component JSX |
| Colours from tailwind.config.js only | No inline hex, no purple/blue gradients |
| Icons from components/icons.tsx only | No Lucide, no icon packages |
| Fonts: Baloo Bhaina 2, Noto Sans, Noto Sans Oriya | No Inter, no serif |
| No em dashes in any text | Use a full stop, comma, or colon instead |
| Buttons >= 56 px tall (48 px in product cards) | Verify in browser dev tools |
| Body text >= 18 px | Verify in browser dev tools |
