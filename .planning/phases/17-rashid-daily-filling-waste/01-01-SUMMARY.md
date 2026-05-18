# Plan 01 — Summary

**Status:** complete

## Delivered

- `lib/models/BatchFillingDailyEntry.ts` — Mongoose model with compound unique index on `(batchNo, entryDate)`
- `lib/batchFillingWaste.ts` — `computeVariance()`, `parseNonNegativeLiters()`, `todayIsoDate()`
- `app/api/batch-filling/route.ts` — GET merges batches + usage map + entries; PATCH upserts entry and snapshots system remaining at save time

## Waste formula

`wasteLiters = systemRemainingLiters − physicalRemainingLiters`
