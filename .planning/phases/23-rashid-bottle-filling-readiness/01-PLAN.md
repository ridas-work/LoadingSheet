---
wave: 1
depends_on: ["17-rashid-daily-filling-waste/03-PLAN.md", "20-nimra-add-product/03-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/BatchFillingDailyEntry.ts"
  - "lib/batchFillingWaste.ts"
  - "app/api/batch-filling/route.ts"
  - "lib/catalogFromDb.ts"
autonomous: true
---

<phase_goal>
Change Rashid daily filling storage/API so operators enter **bottle counts** for daily filled stock and **bottle counts fully ready to deliver**, while the system keeps derived **liter snapshots** for variance against Nimra’s batch liters.
</phase_goal>

<must_haves>
- [ ] **Bottle-first contract:** `PATCH /api/batch-filling` accepts bottle-count data, not `filledLitersToday` / `readyToDeliverLiters` as user input.
- [ ] **Ready definition:** `readyToDeliverBottles` means bottles that are completely ready for shipment: filled, capped, labeled/stickered, packed/finished as required by operations.
- [ ] **Packing selector support:** Because one Nimra batch/family can map to multiple product packings and bottle sizes, each daily filling entry can store one or more packing lines: `{ productCode, productName, litersPerBottle, filledBottlesToday, readyToDeliverBottles }`.
- [ ] **Derived liters:** API computes `filledLitersTodaySnapshot` and `readyToDeliverLitersSnapshot` from `sum(bottles * litersPerBottle)`, rounded with existing liter helpers.
- [ ] **Variance compatibility:** `systemRemainingLiters`, `physicalRemainingLiters`, and `wasteLiters` remain liter-based reconciliation fields; waste uses derived liter snapshots instead of user-entered liters.
- [ ] **Backwards compatibility:** Existing records with old liter fields remain readable. Either migrate in code at read time or add a small one-time script, but do not break admin/history screens.
- [ ] **Validation:** Bottle counts must be non-negative integers. `physicalRemainingLiters` remains a non-negative number. Unknown/ambiguous packings return a clear API error.
- [ ] **Catalog matching:** API returns allowed packing options per batch using `ProductPacking` active catalog rows matched by product name, alias, or `batchFamily`.
</must_haves>

<tasks>
  <task id="1" name="schema-shape">
    <step>Extend `BatchFillingDailyEntry` with `packingLines` array. Include snapshots for `filledLitersToday` and `readyToDeliverLiters` derived from bottle counts.</step>
    <step>Keep existing liter fields optional/deprecated for legacy entries, or map legacy fields into the new API response shape for display.</step>
    <step>Document field semantics in code comments: bottles are operator-entered; liters are derived snapshots.</step>
  </task>

  <task id="2" name="conversion-helpers">
    <step>Add helper functions in `lib/batchFillingWaste.ts` (or a small adjacent module) to parse non-negative integer bottle counts and convert packing lines to liter snapshots.</step>
    <step>Update `computeWasteLiters` call sites to use derived filled/ready liters while keeping physical remaining in liters.</step>
  </task>

  <task id="3" name="api-get">
    <step>Update `GET /api/batch-filling` to include `packingOptions` per batch: active catalog products compatible with the batch’s product/family.</step>
    <step>Return `entry.packingLines`, `filledLitersTodaySnapshot`, `readyToDeliverLitersSnapshot`, `physicalRemainingLiters`, `systemRemainingLiters`, and `wasteLiters`.</step>
    <step>For legacy entries, synthesize a read-only/legacy display line or expose legacy fields so UI can show old data without crashing.</step>
  </task>

  <task id="4" name="api-patch">
    <step>Update `PATCH /api/batch-filling` body to accept `{ batchNo, entryDate, packingLines, physicalRemainingLiters, note? }`.</step>
    <step>Validate every `packingLines[]` row: catalog product exists, is compatible with the batch, bottle fields are integers ≥ 0, and at least one useful value exists when saving a row.</step>
    <step>Snapshot `productName` and `litersPerBottle` onto the entry so historical conversions do not change when the catalog changes later.</step>
    <step>Calculate derived liters, waste, audit fields, and upsert by `{ batchNo, entryDate }` as today.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Existing `GET /api/batch-filling` with old entries still returns rows without runtime errors.
- PATCH with one packing line `{ filledBottlesToday: 100, readyToDeliverBottles: 80, litersPerBottle: 0.75 }` stores bottle counts and liter snapshots `75` / `60`.
- For a batch with multiple compatible packings, API exposes multiple options and requires the UI/API caller to choose one.
- Negative, decimal, or non-numeric bottle counts are rejected.
</verification>
