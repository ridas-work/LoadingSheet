# Plan 02 — Summary

## Completed

- `GET /api/market-visit-alerts` — returns open alerts by store keys (Aslam, Ahtisham, admin).
- Market visit PATCH (`update_market_visit` / `submit_market_visit`) calls `syncMarketVisitAlerts` and returns `openAlertsByStoreKey`.

## Files

- `app/api/market-visit-alerts/route.ts`
- `app/api/field-visits/[id]/route.ts`
