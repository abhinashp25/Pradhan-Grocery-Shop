# Round 2: owner could not add customers or photos

## Causes

1. "Only the owner can do this" when adding a customer. The Edge Functions use the secret service key (role service_role). On this Supabase project that role was never given permission on our tables, so the function could not read the profiles table and wrongly decided the caller was not the owner. Customer login would have failed the same way. Fix: `008_service_role_and_storage.sql`. The function now also says WHY it refused (visible in the owner screen and the function logs).
2. Photo upload failed. The photo policies are created again in 008. The screen now shows the real error text and which step failed (reading the photo, uploading it, saving its name).
3. Duplicate products everywhere (Sona Masoori Rice four times). The sample data file was run more than once. It now does nothing the second time, and `backend/supabase/cleanup_duplicate_products.sql` removes the copies that exist.
4. Cards and loading shapes had no background and a blue outline in some places. Cause: colours made from the light and dark variables could not take an opacity (`bg-line/40`). Fixed.
5. Hole found while checking: any logged-in person could write fake lines into the activity log, and could ask for the balance of an account if they knew its id. Both internal functions are now locked (009).
6. The owner Edge Functions did not check the two-step code. They do now.

## New

- Owner: "Owner dashboard" link in the shop header and menu, so the owner can always come back after "View the shop". A Back button on every page except Home (shop and owner).
- Hero with GSAP animation on all 8 category pages and on Xerox and Print: the name slides up word by word, the icon coin spins in, sub-groups float around it, items count up, the stage leans toward the mouse, the shapes drift as you scroll.
- Skeleton loading for the whole app: a skeleton in `index.html` before the app downloads, page-shaped skeletons for every screen, a moving light, a "net is slow, please wait" note after 7 seconds, and an offline bar.
- Credit age: the app works out how old each customer's unpaid credit is (payments count against the oldest credit first). The customer sees a red note on Home, Account and the credit book when it reaches the reminder days (30 to start; the owner changes it in Shop settings). The owner Dashboard lists late customers with a one-tap WhatsApp reminder, and the credit list and customer screen show the age.
- Chip row on category pages no longer shows a scroll bar on a laptop.

## Not automatic

The app does not send messages by itself. Sending WhatsApp or SMS automatically needs a paid service. Today the customer sees the reminder inside the app, and the owner sends it with one tap.
