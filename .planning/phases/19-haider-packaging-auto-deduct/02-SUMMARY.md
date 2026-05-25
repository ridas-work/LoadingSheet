# Plan 02 — Packaging deduction resolver — complete

## Done

- Added `lib/packagingDeduction.ts` to normalize order `sheetLines` into packaging consumption.
- Uses `ProductPacking.bottlesPerCarton` for carton/box quantities; standard rows count one physical carton per sheet line.
- Handles mixed/custom rows through `mixedContents` and bundle rows through `bundleComponents`.
- Added packaging mapping fields: `linkedBatchFamily` and `deductAs`, while preserving `linkedProductCode`.
- Extended packaging seed script and JSON catalog with deduction mappings, including Rhino 250ml boxes (`20` bottles/carton from product catalog).
- Deduction preview reports item-level quantities, missing mappings, and insufficient stock.

## Verification

- `data/packaging-items.json` parses successfully.
- `npm run build` passes.
