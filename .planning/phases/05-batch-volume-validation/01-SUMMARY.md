# Plan 01 Summary — Batch volume & weight validation

**Status:** Complete  
**Wave:** 1

## Delivered

- **`litersPerBottle`** on product catalog + seed JSON (stickers may be kg; app uses liters).
- **`Order.batchDefs[]`** — `{ batchNo, totalLiters }` per order.
- **`lib/batchVolume.ts`** — row liters, validation, usage summaries.
- **PATCH batches API** — accepts `batchDefs`, auto-sets `sheetLines[].weight`, rejects over-allocation.
- **Loading sheet edit UI** — batch total liters inputs, used/remaining summary (screen only), Weight (L) column on print.
- **README** — liters workflow note.

## Stakeholder note

Bottle stickers in **kg**; batch totals and weights tracked in **liters** as requested.

## Verification

- `npm run build` — passed.
