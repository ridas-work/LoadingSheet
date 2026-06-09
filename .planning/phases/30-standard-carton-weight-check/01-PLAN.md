---
wave: 1
depends_on: ["05-batch-volume-validation/01-PLAN.md", "06-dispatch-assignment/06-UAT.md"]
gap_closure: false
files_modified:
  - "data/standard-carton-weights.json"
  - "lib/standardCartonWeight.ts"
  - "lib/models/Order.ts"
  - "lib/preserveSheetBatches.ts"
autonomous: true
---

<phase_goal>
Seed the **factory standard carton weight list** (kg) and add **`cartonWeightKg`** on sheet lines with lookup + ±8% validation helpers — without changing existing **Weight (L)** liter logic.
</phase_goal>

<must_haves>
- [ ] `data/standard-carton-weights.json` — 16 rows from factory sheet; each entry: `packingCode` (or `summaryLabel`), `bottlesPerCarton`, `standardWeightKg`.
- [ ] `lib/standardCartonWeight.ts`: `lookupStandardCartonWeight(productName, bottlesPerBox, catalog)`, `validateCartonWeight(actualKg, standardKg, tolerancePct=0.08)`, `CARTON_WEIGHT_TOLERANCE_PCT`.
- [ ] `SheetLineSchema.cartonWeightKg` optional number (min 0).
- [ ] `preserveSheetBatches` copies `cartonWeightKg` when row identity matches.
- [ ] Unit tests optional; manual test vectors in verification.
</must_haves>

<tasks>
  <task id="1" name="standard-weight-data">
    <step>Create JSON with all 16 standard rows mapped to `product-packings.json` codes (washout-lemon, rhino-500ml, power-wash-dish-degrease-bundle, etc.).</step>
    <step>Fix Brighten spelling to catalog name; Titan 11.37 kg.</step>
  </task>
  <task id="2" name="validation-lib">
    <step>Implement lookup: match packing by name/alias/summaryLabel + exact `bottlesPerBox`.</step>
    <step>Return `{ ok: true }` or `{ ok: false, error, minKg, maxKg, standardKg }` with message: “Weight {actual} kg is outside standard {standard} kg (±8%). Check the box — bottles missing or extra?”</step>
  </task>
  <task id="3" name="schema">
    <step>Add `cartonWeightKg` to sheet line schema and TypeScript types used by loading sheet.</step>
    <step>Update `preserveSheetBatches` to retain field on admin rebuild.</step>
  </task>
</tasks>

<verification>
- Lookup `Rhino 500ml` + 30 bottles → 17.4 kg.
- 17.4 × 1.08 = 18.792 pass; 19.0 fail.
- `npm run build` passes.
</verification>
