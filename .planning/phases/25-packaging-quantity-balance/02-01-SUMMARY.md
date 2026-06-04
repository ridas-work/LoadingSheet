# Plan 02 — Rashid filling → UIP

**Status:** Complete

- `lib/packagingFillingDeduction.ts` + `lib/packagingStockApply.ts`
- Batch filling save applies bottle/cap UIP delta (idempotent via `packagingUipApplied`)
- Blocks save when balance insufficient
