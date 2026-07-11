# Plan 01 — Summary

## Completed

- Added `MarketVisitStoreAlert` MongoDB model with partial unique index on open alerts (`storeKey` + `skuKey` where `resolvedAt` is null).
- Added `lib/marketVisitStoreKey.ts` for stable store matching across visits.
- Added `lib/marketVisitAlerts.ts` with `syncMarketVisitAlerts` and `fetchOpenAlertsByStoreKeys`.

## Behavior

- **N** on save → upsert open alert for store + SKU.
- **Y** on save → resolve open alert.
- Empty cells do not change alert state.
