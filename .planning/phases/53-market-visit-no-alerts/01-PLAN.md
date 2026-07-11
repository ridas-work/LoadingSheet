---
wave: 1
depends_on: []
files_modified:
  - lib/models/MarketVisitStoreAlert.ts
  - lib/marketVisitAlerts.ts
autonomous: true
---

# Plan 01 — Alert schema and helpers

## Objective

Add a persistent **open-alert registry** keyed by store + SKU so N availability survives across market visit tickets.

## Tasks

<task id="01-1">
Create `lib/models/MarketVisitStoreAlert.ts`:
- Fields: `storeKey`, `storeName`, `location`, `skuKey`, `openedAt`, `openedByVisitId`, `openedByUsername`, `resolvedAt`, `resolvedByVisitId`
- Partial unique index on `{ storeKey: 1, skuKey: 1 }` where `resolvedAt: null`
- Index `{ storeKey: 1, resolvedAt: 1 }` for lookups
</task>

<task id="01-2">
Create `lib/marketVisitAlerts.ts`:
- `normalizeMarketStoreKey(storeName, location): string`
- `syncMarketVisitAlerts({ visitId, username, rows })` — apply N→open, Y→resolve rules
- `fetchOpenAlertsByStoreKeys(storeKeys: string[]): Promise<Record<string, string[]>>` — map storeKey → skuKey[]
- Validate `skuKey` against `MARKET_VISIT_SKU_KEYS`
</task>

## Verification

- [ ] `npm run build` passes
- [ ] `normalizeMarketStoreKey("Al Fatah", "Lahore")` stable across casing/spacing
- [ ] Unit-level manual test: sync N creates doc; sync Y sets `resolvedAt`

## must_haves

- Open alerts are unique per store+SKU
- Resolved alerts do not block new N on a later visit (new open row allowed after resolve)
