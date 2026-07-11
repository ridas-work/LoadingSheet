---
wave: 1
depends_on: []
files_modified:
  - data/market-visit-sku-catalog.json
  - lib/marketVisitCatalog.ts
  - lib/marketVisitTypes.ts
  - lib/models/FieldVisitTicket.ts
  - lib/fieldVisitTickets.ts
autonomous: true
---

# Plan 01 — Schema, SKU catalog, and helpers

## Objective

Add `visitKind: "sales" | "market_audit"` and embedded market visit data to `FieldVisitTicket`, plus a static SKU catalog matching the paper form.

## Tasks

<task id="01-1">
Create `data/market-visit-sku-catalog.json` with 14 SKU entries: `key`, `group`, `columnLabel`, optional `packingCode` mapping to `product-packings.json`.
</task>

<task id="01-2">
Create `lib/marketVisitCatalog.ts` — export `MARKET_VISIT_SKUS`, `getMarketVisitSkuGroups()`, types for `MarketVisitSkuKey`.
Create `lib/marketVisitTypes.ts` — `MarketVisitRow`, `MarketVisitAvailability`, empty row factory, validation helpers.
</task>

<task id="01-3">
Extend `lib/models/FieldVisitTicket.ts`:
- `visitKind: { type: String, enum: ["sales", "market_audit"], default: "sales" }`
- `marketVisitDate`, `marketVisitRemarks`, `marketVisitRows[]`, `marketVisitSubmittedAt`
- Row sub-schema: storeName, location, availability (Map or nested object per sku key), facingUnits, remarks
</task>

<task id="01-4">
Update `lib/fieldVisitTickets.ts`:
- `MARKET_VISIT_REP_USERNAMES = ["aslam", "ahtisham"]`
- `isMarketVisitRep(username)`, `defaultVisitKindForUser(username)`
- Extend `SerializedTicket` with market visit fields
- Update `serializeFieldVisitTicket` to include market data
- Ensure `pendingFieldVisitSampleMongoFilter` adds `{ visitKind: "sales" }` (or `$ne: "market_audit"`)
</task>

## Verification

- [ ] TypeScript compiles; existing sales tickets default `visitKind: "sales"`
- [ ] Catalog has exactly 14 columns in order from research
- [ ] `defaultVisitKindForUser("aslam")` → `"market_audit"`; `"nouman"` → `"sales"`

## must_haves

- Schema supports multi-store rows with per-SKU availability and facing units
- SKU catalog is single source of truth for column headers
- Sample approval queries exclude market_audit tickets
