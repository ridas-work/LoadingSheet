---
wave: 2
depends_on: ["19-haider-packaging-auto-deduct/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/packagingDeduction.ts"
  - "lib/models/PackagingItem.ts"
  - "lib/models/PackagingStockMovement.ts"
  - "lib/models/ProductPacking.ts"
  - "data/packaging-items.json"
  - "scripts/seed-packaging-items.ts"
autonomous: true
---

<phase_goal>
Create a reliable packaging deduction engine that converts a delivered order into packaging material requirements using actual order rows and `ProductPacking` metadata like `bottlesPerCarton`.
</phase_goal>

<must_haves>
- [ ] Use `ProductPacking.bottlesPerCarton` as the source of truth for carton capacity. Example: `rhino-250ml` has `bottlesPerCarton: 20`, so 20 Rhino 250ml bottles consume 1 carton/box, 40 consume 2, etc.
- [ ] Deduct **bottles/pouches**, **caps/lids/pumps**, **stickers/labels**, and **cartons/boxes** where packaging item mappings exist.
- [ ] Standard loading-sheet rows: deduct based on `sheetLines` physical rows and `bottlesPerBox`; one sheet line is one physical carton unless the product is a bundle/custom mixed line.
- [ ] Mixed sample / custom carton rows: deduct component bottles/stickers/caps from `mixedContents`; deduct one physical box/carton for each mixed/custom sheet line where a matching box item exists.
- [ ] Bundle products: use existing `bundleComponents` to deduct component product materials and one bundle/carton box where mapped.
- [ ] Add/extend mapping fields so packaging items can link to product packings and usage categories. Existing `linkedProductCode` is enough for bottles/stickers by SKU, but boxes/caps that serve a family may need `linkedBatchFamily`, `deductAs`, or equivalent.
- [ ] Deduction preview returns item-level deltas before applying: `{ itemCode, itemName, category, quantity, reasonDetail }[]`.
- [ ] Missing mappings are reported clearly and do not silently deduct the wrong material.
- [ ] Negative stock policy is explicit. Prefer blocking delivery deduction with a clear error if stock would go below zero, unless user confirms allowing negative stock.
</must_haves>

<tasks>
  <task id="1" name="mapping-model">
    <step>Review `PackagingItem` categories and `data/packaging-items.json` for linked product codes.</step>
    <step>Add mapping support for shared family materials: e.g. Rhino caps/lids, Wash Out boxes, Brighten/Fabrito shared boxes, Power Wash/Degreaser boxes, pouch boxes.</step>
    <step>Keep mappings seedable through `data/packaging-items.json` and `scripts/seed-packaging-items.ts`.</step>
  </task>

  <task id="2" name="order-consumption-normalizer">
    <step>Create `lib/packagingDeduction.ts` with pure helpers to normalize an order into consumed product units and physical cartons.</step>
    <step>For standard rows, resolve product by `ProductPacking` name/alias/batchFamily and count bottles from `bottlesPerBox` per sheet line.</step>
    <step>For mixed/custom rows, count component bottles from `mixedContents` and count one physical mixed carton per sheet line.</step>
    <step>For bundle rows, use `ProductPacking.bundleComponents` to count component bottles and bundle cartons.</step>
  </task>

  <task id="3" name="deduction-preview">
    <step>Resolve normalized consumption to packaging items by mapping rules.</step>
    <step>Calculate bottle/cap/sticker/label/pouch quantity as bottle or component count.</step>
    <step>Calculate carton/box quantity from physical rows where possible; if deriving from bottle count, use `Math.ceil(bottleCount / ProductPacking.bottlesPerCarton)` and document that cartons represent physical ship boxes.</step>
    <step>Return preview lines and missing mapping warnings for UI/API use.</step>
  </task>

  <task id="4" name="unit-tests-or-focused-checks">
    <step>Add focused tests if this repo has a test setup. If not, add a small script or documented verification case in the summary.</step>
    <step>Include Rhino 250ml example: 40 shipped bottles at 20 bottles/carton => 2 cartons, 40 bottles, 40 stickers/labels, matching caps/lids where mapped.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Deduction preview for Rhino 250ml uses `bottlesPerCarton: 20`.
- Standard, mixed/custom carton, and bundle lines produce expected consumption.
- Missing packaging mappings are surfaced as warnings/errors, not ignored silently.
- Existing packaging inventory manual count still serializes correctly.
</verification>
