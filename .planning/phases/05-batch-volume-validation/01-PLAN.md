---
wave: 1
depends_on: ["04-production-batch-entry/02-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/models/Order.ts"
  - "lib/models/ProductPacking.ts"
  - "lib/batchVolume.ts"
  - "data/product-packings.json"
  - "scripts/seed-product-packings.ts"
  - "app/api/orders/[id]/batches/route.ts"
  - "components/LoadingSheetBatchEditor.tsx"
  - "app/(app)/orders/[id]/loading-sheet/page.tsx"
  - "README.md"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
When **Nimra** assigns a **batch number**, she also records **how many liters that production batch holds**. The system **auto-calculates liters per carton row** from product size × bottles per carton, **validates** that total liters drawn from a batch never exceed the batch size, and **fills the Weight column** on the loading sheet. PO users see weights on print; Nimra sees a **batch capacity summary on screen** (not required on the printed paper).
</phase_goal>

<domain_model>
## What a “batch” means here

A **production batch** (e.g. `260415`) is one manufactured lot with a **fixed total volume in liters** (e.g. `1000` L).

Each **loading-sheet row** = **one carton**. That row already has:
- `bottlesPerBox` = bottles **in that carton** (column “NO OF BOTTLES” on paper)
- `productName` → links to catalog for **liters per bottle** (new field)

**Liters consumed by one row:**

```
rowLiters = bottlesPerBox × litersPerBottle(product)
```

**Example (your scenario):** batch `B1` = **1000 L**, product = **100 L per bottle**, each carton has **10 bottles** → one row uses **1000 L** (whole batch). A second row with the same batch → **error** (1100 L > 1000 L).

If each carton has **1 bottle × 100 L**, you can assign **at most 10 rows** to batch `B1` across the order.

## Batch total: where it lives

On each **Order**, add:

```ts
batchDefs: [{ batchNo: string, totalLiters: number, productName?: string }]
```

- Nimra enters **`totalLiters` once per `batchNo`** on that order (first time she uses that batch, or via a small “Batch sizes” panel in edit mode).
- Validation is **per order** for v1 (same batch number on two different POs does not share quota yet — document as future enhancement).

## Row weight column

- `sheetLines[].weight` = **liters for that carton** (auto-calculated on save).
- Matches the paper **Weight** column — **show on loading sheet print**.
- Nimra does **not** type weight per row manually unless we add override later; auto-fill reduces errors.

## Product catalog

Add **`litersPerBottle`** to `ProductPacking` + `data/product-packings.json` (e.g. Rhino 750ml → `0.75`).

Match `productName` on sheet lines to catalog `name` (same fuzzy match as today). Custom products: require manual `litersPerBottle` on the PO line or block batch save with a clear error.

</domain_model>

<ui_recommendation>
## Should we show batch quantity on the loading sheet?

| What | Show on **print**? | Show on **screen** (Nimra edit)? |
|------|-------------------|----------------------------------|
| **Weight per row** (L per carton) | **Yes** — paper column | Yes |
| **Batch total size** (e.g. 1000 L) | **No** — not on your paper today | **Yes** — summary panel |
| **Used / remaining** per batch | **No** | **Yes** — prevents over-allocation |

**Recommendation:** Per-row **Weight** on print; **batch capacity** (total / used / remaining) only in Nimra’s edit toolbar or a side panel — operational aid, not extra print clutter.

Edit mode additions for Nimra:
1. For each distinct `batchNo` in use: input **Total liters (batch size)**.
2. Live summary: `Batch 260415 — 800 / 1000 L used (200 L remaining)`.
3. On Save: server rejects if any batch is over-allocated; client shows which batch and by how much.
</ui_recommendation>

<must_haves>
- [ ] `ProductPacking.litersPerBottle` seeded for catalog products (reasonable defaults from SKU name where possible).
- [ ] `Order.batchDefs[]` stores `{ batchNo, totalLiters }` per order.
- [ ] `lib/batchVolume.ts`: `rowLiters(line, catalog)`, `validateBatchUsage(sheetLines, batchDefs, catalog)` → errors with batchNo + overage.
- [ ] `PATCH /api/orders/[id]/batches` accepts `batchDefs` + row batch assignments; sets `sheetLines[].weight` from formula; returns 400 on over-allocation.
- [ ] Loading sheet edit UI: batch total liters inputs + used/remaining summary (screen only).
- [ ] Loading sheet print: **Weight** column shows saved row liters.
- [ ] Clear error if product has no `litersPerBottle` and batch save attempted.
</must_haves>

<tasks>
  <task id="1" name="catalog-liters-per-bottle">
    <step>Add `litersPerBottle: Number` to `ProductPacking` schema and seed JSON (derive from ml in name where obvious, e.g. 750ml → 0.75).</step>
    <step>Update seed script; document field in README.</step>
  </task>

  <task id="2" name="order-batch-defs">
    <step>Add `batchDefs` sub-schema on `Order`: `batchNo` (trimmed string), `totalLiters` (positive number).</step>
    <step>Optional unique index per order on `batchNo` in application logic.</step>
  </task>

  <task id="3" name="batch-volume-lib">
    <step>Create `lib/batchVolume.ts` with row liter calculation and validation (group by `batchNo`, sum row liters ≤ `totalLiters`).</step>
    <step>Resolve `litersPerBottle` by matching `sheetLines[].productName` to catalog.</step>
  </task>

  <task id="4" name="api-batches-extend">
    <step>Extend PATCH body: `{ batches: [{ boxNo, batchNo }], batchDefs: [{ batchNo, totalLiters }] }`.</step>
    <step>After validation: update `batchNo`, compute and set `weight` per row, persist `batchDefs`.</step>
    <step>400 response: `{ error, details: { batchNo, usedLiters, totalLiters } }`.</step>
  </task>

  <task id="5" name="ui-nimra-batch-totals">
    <step>Extend `LoadingSheetBatchEditor` edit mode: section for batch total liters (one field per distinct batchNo).</step>
    <step>Client-side preview of used/remaining before save (same math as server).</step>
    <step>Display row weight in view mode and print (already have weight column — wire to computed values).</step>
  </task>

  <task id="6" name="docs">
    <step>REQUIREMENTS.md Phase 05 section; README workflow note (batch size + auto weight + validation).</step>
  </task>
</tasks>

<out_of_scope>
- Cross-order / global batch pool (same batchNo on two POs sharing one 1000 L tank) — future.
- Manual override of row weight — future unless stakeholder asks.
- Weight entry by dispatch role — still Phase 06 (dispatch).
</out_of_scope>

<verification>
- Product Rhino 750ml: `litersPerBottle = 0.75`, carton `bottlesPerBox = 10` → row = **7.5 L**.
- Batch `B1` total **1000 L**, assign 134 rows that each consume 7.5 L → fail on row that exceeds 1000 L total.
- Print loading sheet shows per-row Weight; batch total summary visible only in edit UI.
- `npm run build` passes.
</verification>

<stakeholder_confirm>
Before execute: confirm **liters per bottle** comes from product catalog (not entered per row) and **batch total liters** is entered once per batch per order. If your paper uses **kg** not liters, same math with `kgPerBottle` naming — adjust in execute if needed.
</stakeholder_confirm>
