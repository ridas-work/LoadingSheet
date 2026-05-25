# Plan 01 — Data/API bottle-count filling — complete

## Done

- Extended `BatchFillingDailyEntry` with `packingLines[]` for per-product bottle rows.
- Kept top-level `filledLitersToday` and `readyToDeliverLiters` as derived/legacy-compatible liter totals.
- Added helpers for whole bottle-count parsing and bottle-to-liter snapshot totals.
- Added catalog matching for batch-compatible packing options by product name, aliases, and `batchFamily`.
- Updated `GET /api/batch-filling` to return `packingOptions`, bottle rows, derived liter totals, and legacy flags.
- Updated `PATCH /api/batch-filling` to accept `packingLines` with bottle counts, validate products per batch, snapshot `litersPerBottle`, derive liters, and compute waste.

## Verification

- `npm run build` passes.
