# Translation Review

This file lists keys where the AI was uncertain.
A native Odia and Hindi speaker must check these before the app goes live.

---

## Odia (or.json) — Keys to verify

| Key | AI translation | Reason for uncertainty |
|-----|---------------|------------------------|
| `recentSearches` | ଟ୍ରରୁ ଖୋଜାଯାଇଥିଲା | Unnatural phrasing. A native speaker may prefer "ଆଗରୁ ଖୋଜାଯାଇଥିଲା" or similar. |
| `skipToContent` | ସିଧା ভিতরে ଯାଅ | Contains a Bengali character (ভিতরে) by mistake. Should be pure Odia: "ସିଧା ଭିତରକୁ ଯାଅ". |
| `statusReplaced` | ବଦଳ ଗଲା | "Replaced" has no exact Odia word. Check if "ନୂଆ ତାଲିକା ଆଇଲା" is more natural. |
| `advancePaid` | ଆଗୁଆ ଦେଇ ସାରିଛନ୍ତି | "Advance paid" context is credit book. Check phrasing matches how the shopkeeper talks. |
| `correction` | ସଂଶୋଧନ | Formal word. A simpler word like "ଠିକ ହୋଇଲା" may be better. |
| `priceUpdated` | {date}ରେ ଦର ଅଦ୍ୟତନ | "ଅଦ୍ୟତନ" may be unfamiliar to older customers. Consider "ଦର ବଦଳାଗଲା {date}ରେ". |
| `timesIndian` | ସମୟ ଭାରତୀୟ ସମୟ ଅନୁଯାୟୀ | Phrasing may sound technical. Simplify if possible. |
| `storeOnly` | ଏ ଆପ ଶୁଧୁ ଦୋକାନ ପାଇଁ... | Long sentence. A native speaker may split it differently. |
| `rateMayChange` | ଦର ବଦଳି ଥାଇ ପାରେ | Check tense and word order — may vary by dialect. |
| `inList` | ତାଲିକାରେ ଅଛି: {count} | Plural form is not separate in this system. Verify the phrasing reads well for both 1 and many items. |

---

## Hindi (hi.json) — Keys to verify

| Key | AI translation | Reason for uncertainty |
|-----|---------------|------------------------|
| `recentSearches` | पहले खोजा था | Singular form used. With multiple searches "पहले खोजे थे" may be better. |
| `statusReplaced` | बदल गया | Same issue as Odia — "Replaced" has no perfect Hindi equivalent in this context. |
| `advancePaid` | पहले से दे दिया है | Check with local shopkeeper — phrasing for credit book context. |
| `correction` | सुधार | Acceptable, but some may say "गलती ठीक की". Verify. |
| `balanceHidden` | अपना बकाया जानने के लिए दुकान में पूछें | "बकाया" is correct but verify customers understand it means their outstanding credit. |
| `triesLeft` | {count} बार और कोशिश कर सकते हैं | Plural form is not handled. For 1 try: "1 बार और कोशिश कर सकते हैं" reads slightly oddly. |
| `timesIndian` | समय भारतीय समय के अनुसार है | Acceptable but slightly formal. Simplify if needed. |
| `inList` | सूची में है: {count} | Same plural concern as Odia. |
| `whatsapp` | WhatsApp पर शेयर करें | English brand name kept. This is correct but verify the label style is consistent with other apps villagers use. |

---

## Critical fix required (Odia)

The key `skipToContent` in `or.json` was written with a Bengali character by mistake.

**Current (wrong):** `"ସିଧା ভিতরে ଯାଅ"`
**Correct:** `"ସିଧା ଭିତରକୁ ଯାଅ"`

This must be fixed before release.

---

## Notes for the reviewer

- All placeholders `{count}`, `{name}`, `{phone}`, `{date}`, `{time}`, `{spot}` must remain exactly as-is.
- The rupee symbol `₹` must not be changed.
- Shop name `ପ୍ରଧାନ ଗ୍ରୋସରୀ ଷ୍ଟୋର` (Odia) and `प्रधान ग्रोसरी स्टोर` (Hindi) must not be changed.
- No em dashes anywhere. Use full stop, comma, or colon.
- After any change to or.json or hi.json, run `cd frontend && npm run build` to confirm no errors.
