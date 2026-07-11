# Phase 51 Verification

**Status:** passed (code verified; factory UAT human_needed)  
**Goal:** Custom carton outer box picker end-to-end

| # | Check | Result |
|---|-------|--------|
| 1 | Five `custom-box-*` SKUs on `/dispatch/inventory` | **human** — run `npm run seed:custom-carton-boxes` on UAT DB |
| 2 | Custom carton UI shows required **Outer box size** on `/new-order` | **pass** — `CustomCartonBuilder` select + validation |
| 3 | API rejects custom carton without `customBoxCode` | **pass** — `parseCustomCartons` in `lib/orderPayload.ts` |
| 4 | Loading sheet `mixed_sample` rows store `customBoxCode` | **pass** — `lib/hybridSheetLines.ts` |
| 5 | Gate delivery preview deducts selected custom box (not family box) | **pass** — `lib/packagingDeduction.ts` `customBoxCodes` loop |
| 6 | BOM still deducts bottles/caps/stickers per inner products | **pass** — BOM `requirements` unchanged |
| 7 | Admin edit fixes legacy cartons missing box code | **pass** — amber banner + validation in `AdminOrderEditForm` |
| 8 | PO detail shows outer box label | **pass** — `lib/orderPoDetail.ts` title suffix |
| 9 | `npm run build` | **pass** |

## UAT script

1. Run `npm run seed:custom-carton-boxes` (Haider inventory must list five CUSTOM BOX rows).
2. Log in as **Nouman** → New order → add custom carton (Rhino 750 + Brighten pouch) → pick **Outer box: 500 ml** → submit.
3. Rashid loading sheet → one mixed row per custom carton with correct label.
4. Complete dispatch to gate → **Zaman** close delivered → Haider inventory UIP: `custom-box-500ml` +1 per carton; Rhino BOM lines present.
5. **Waleed** edit on an old PO missing box code → select outer box → save → gate succeeds.
