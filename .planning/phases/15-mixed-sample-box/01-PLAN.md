---
wave: 1
depends_on: ["14-po-product-entry-table/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/Order.ts"
  - "lib/buildSheetLines.ts"
  - "lib/mixedSampleBox.ts"
  - "app/api/orders/route.ts"
  - "lib/bundleCatalog.ts"
  - "lib/orderBatchStatus.ts"
  - "app/api/orders/[id]/batch-assignments/route.ts"
autonomous: true
---

<phase_goal>
Support **mixed sample box** orders: multiple products with **partial bottle counts** ship in **one physical carton** (or N identical mixed cartons), with correct loading-sheet rows and **per-product batch assignment**.
</phase_goal>

<must_haves>
- [ ] `Order` has `orderKind` (`standard` | `mixed_sample`) and optional `mixedSample: { boxCount, contents[] }`.
- [ ] `sheetLines` rows for mixed sample have `lineKind: "mixed_sample"`, `mixedContents[]`, and `componentBatches` for dispatch.
- [ ] `buildMixedSampleSheetLines()` produces **one row per physical box** (not one row per product).
- [ ] POST `/api/orders` accepts mixed sample payload; validates bottles ≥ 1 per included product, boxCount ≥ 1.
- [ ] Batch assignment + liter validation work for mixed lines (reuse/extend bundle logic).
- [ ] Standard carton orders unchanged.
</must_haves>

<tasks>
  <task id="1" name="schema-and-build-lines">
    <step>Add `orderKind`, `mixedSample` subdocument, and on `SheetLineSchema`: `lineKind` (default `standard`), `mixedContents: [{ productName, bottles }]`.</step>
    <step>Create `lib/mixedSampleBox.ts`: format display label, build lines from `{ boxCount, contents }`, total bottles per box, helpers for liter allocation.</step>
    <step>Update `buildSheetLines` usage in POST handler: if `orderKind === "mixed_sample"`, call mixed builder; else existing path.</step>
  </task>

  <task id="2" name="batch-api-validation">
    <step>Extend `bundleCatalog` (or mixed helper) so `lineBatchComplete`, `lineBatchAllocations`, `validateSheetBatchAllocations` treat `mixed_sample` lines like bundles using `mixedContents`.</step>
    <step>Update batch-assignments route to read/write `componentBatches` for mixed lines.</step>
  </task>
</tasks>

<verification>
- Create mixed order: 5× Product A + 2× Product B, boxCount=1 → loading sheet shows **1 row**, not 2.
- boxCount=2 → **2 rows**, same mix in each.
- Nimra/Rashid can assign separate batch per product inside the mix.
- `npm run build` passes.
</verification>
