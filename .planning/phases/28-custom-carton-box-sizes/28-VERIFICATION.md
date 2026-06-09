# Phase 28 Verification

**Status:** passed  
**Date:** 2026-06-08

## Must-haves

| Check | Result |
|-------|--------|
| Five `custom-box-*` SKUs in seed data | ✓ `data/packaging-items.json` |
| `lib/customCartonBoxes.ts` validator + options | ✓ |
| Order + sheet line `customBoxCode` | ✓ `Order.ts`, `hybridSheetLines.ts`, `mixedSampleBox.ts` |
| `parseCustomCartons` validation | ✓ `orderPayload.ts` |
| Deduction by custom box code (not family) | ✓ `packagingDeduction.ts` |
| Ready-shelf skip for custom box | ✓ `summarizePackagingConsumptionExcludingReady` |
| UI outer box select | ✓ `CustomCartonBuilder.tsx` |
| Admin edit + legacy warning | ✓ `AdminOrderEditForm.tsx` |
| `npm run build` | ✓ |

## Manual UAT

1. Seed packaging → five CUSTOM BOX rows on `/dispatch/inventory`.
2. New hybrid PO → custom carton → pick **500 ml** → save → sheet line has `customBoxCode`.
3. Legacy PO → admin edit → select box size → save → gate delivery no family mapping error for that row.
