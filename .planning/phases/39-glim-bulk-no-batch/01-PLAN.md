---
wave: 1
depends_on: []
gap_closure: false
files_modified:
  - "lib/models/ProductPacking.ts"
  - "lib/bulkFillProduct.ts"
  - "data/product-packings.json"
  - "data/product-packaging-bom.json"
  - "scripts/seed-product-packings.ts"
autonomous: true
---

<phase_goal>
Add **`requiresProductionBatch`** catalog flag and seed **Glim** as a bulk-fill product (no Nimra QC batch). Central helper used by batch validation and UI in later plans.
</phase_goal>

<must_haves>
- [ ] `ProductPacking` schema: `requiresProductionBatch: { type: Boolean, default: true }`.
- [ ] `lib/bulkFillProduct.ts`:
  - `isBulkFillProduct(line, catalog)` — match line to packing via `findPackingByName`; return `requiresProductionBatch === false`.
  - `bulkFillBatchLabel()` → `"Bulk fill"` (single string for print/UI).
- [ ] Seed **Glim** in `data/product-packings.json` if missing: `code: glim`, sensible `bottlesPerCarton`, `litersPerBottle`, `requiresProductionBatch: false`, `batchFamily: "Glim"` or empty.
- [ ] `scripts/seed-product-packings.ts` persists `requiresProductionBatch` (default true when omitted in JSON).
- [ ] Existing products unchanged (all default `requiresProductionBatch: true`).
</must_haves>

<tasks>
  <task id="T1" title="Schema + helper">
    <step>Add field to `ProductPacking` model.</step>
    <step>Create `lib/bulkFillProduct.ts` with `isBulkFillProduct` and `bulkFillBatchLabel`.</step>
  </task>
  <task id="T2" title="Seed Glim catalog row">
    <step>Add Glim to product-packings JSON with `requiresProductionBatch: false`.</step>
    <step>Ensure BOM entry `glim` already exists in `product-packaging-bom.json` (from phase 36).</step>
    <step>Run seed script on deploy.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Mongo `productpackings` has `glim` with `requiresProductionBatch: false`.
</verification>
