---
wave: 2
depends_on: ["53-market-visit-no-alerts/01-PLAN.md"]
files_modified:
  - app/api/market-visit-alerts/route.ts
  - app/api/field-visits/[id]/route.ts
autonomous: true
---

# Plan 02 — API: sync alerts and fetch open state

## Objective

Wire alert sync into market visit save/submit and expose open alerts to the form.

## Tasks

<task id="02-1">
Add `GET /api/market-visit-alerts`:
- Auth: market visit reps (`aslam`, `ahtisham`) or admin
- Query: `storeKeys` comma-separated (max ~50)
- Response: `{ alertsByStoreKey: Record<string, string[]> }`
</task>

<task id="02-2">
In `app/api/field-visits/[id]/route.ts`, after successful `update_market_visit` and `submit_market_visit`:
- Call `syncMarketVisitAlerts` with ticket id, username, parsed rows
- Include `openAlertsByStoreKey` in JSON response for rows on that ticket (optional convenience)
</task>

<task id="02-3">
Ensure only `market_audit` / market visit tickets trigger sync — not sales visits.
</task>

## Verification

- [ ] Save draft with N → `MarketVisitStoreAlert` row exists
- [ ] Save with Y on same store+SKU → `resolvedAt` set
- [ ] GET alerts returns sku keys for store key
- [ ] Unauthorized roles get 403 on alerts API

## must_haves

- Alert state updates on both draft save and submit
- API returns only **open** alerts (`resolvedAt: null`)
