---
wave: 1
depends_on: ["22-hybrid-order-custom-boxes/01-PLAN.md", "26-ready-bottle-stock-ledger/03-PLAN.md"]
gap_closure: false
files_modified:
  - "data/packaging-items.json"
  - "scripts/seed-packaging-items.ts"
  - "lib/models/PackagingItem.ts"
  - "lib/models/Order.ts"
  - "lib/hybridSheetLines.ts"
  - "lib/mixedSampleBox.ts"
  - "lib/buildSheetLines.ts"
  - "lib/packagingDeduction.ts"
  - "lib/customCartonBoxes.ts"
autonomous: true
---

<phase_goal>
Add **five global custom outer box** packaging SKUs (5L jar, 1L, 500ml, 250ml, 100ml) and wire **custom carton** sheet lines to deduct the selected box instead of per-product-family mixed boxes.
</phase_goal>

<must_haves>
- [ ] Five items in `data/packaging-items.json` + seed script upserts them as active `box` SKUs.
- [ ] `lib/customCartonBoxes.ts` exports allowed codes, labels, and `isCustomCartonBoxCode()` validator.
- [ ] `CustomCartonDef` + `CustomCartonSchema` include required `customBoxCode` (one of five).
- [ ] `SheetLine` / schema optional `customBoxCode` copied onto each `mixed_sample` row built from a custom carton.
- [ ] `parseCustomCartons` validates `customBoxCode` is required and valid.
- [ ] `summarizePackagingConsumption` + `summarizePackagingConsumptionExcludingReady`: for mixed lines with `customBoxCode`, add **1 outer box** per sheet line to consumption (keyed by packaging item code); **do not** add `mixedBoxFamilies` for those lines.
- [ ] Deduction preview resolves box by **item code** directly (new helper `findCustomCartonBoxItem`).
- [ ] Ready-shelf skip (Phase 26+) still applies: no custom box deduct when entire line is ready-shelf (`deductCarton === false`).
- [ ] `npm run build` passes.
</must_haves>

<tasks>
  <task id="1" name="packaging-skus">
    <step>Add five `custom-box-*` rows to `data/packaging-items.json` with sensible `sortOrder` after existing box items.</step>
    <step>Confirm `scripts/seed-packaging-items.ts` upserts; document `npm run seed:packaging` in plan verification.</step>
    <step>Optional: `customCartonBox: true` on `PackagingItem` schema for future UI filters (default false).</step>
  </task>

  <task id="2" name="custom-carton-box-helper">
    <step>Create `lib/customCartonBoxes.ts` with `CUSTOM_CARTON_BOX_OPTIONS`, `normalizeCustomBoxCode`, `assertValidCustomBoxCode`.</step>
    <step>Export type `CustomCartonBoxCode` union for TS safety.</step>
  </task>

  <task id="3" name="order-and-sheet-model">
    <step>Add `customBoxCode` to `CustomCartonSchema` (required string, trim, lowercase).</step>
    <step>Add optional `customBoxCode` on `SheetLineSchema`.</step>
    <step>Extend `CustomCartonDef` in `hybridSheetLines.ts`.</step>
    <step>In `mergeStandardAndCustomSheetLines`, pass `customBoxCode` into each generated mixed line.</step>
    <step>Extend `buildMixedSampleSheetLines` return type / `MixedSheetLine` with optional `customBoxCode` param from parent carton.</step>
  </task>

  <task id="4" name="payload-validation">
    <step>`parseCustomCartons`: require `customBoxCode`; error `customCartons.{i}.customBoxCode` if missing/invalid.</step>
    <step>Pure `mixed_sample` order path (`parseMixedSample`): if still supported standalone, add same field on `mixedSample` wrapper or require via customCartons-only in v1 (document choice in SUMMARY).</step>
  </task>

  <task id="5" name="packaging-deduction">
    <step>Add `customBoxCodes: Map<string, number>` to consumption OR reuse `productCartons` with packaging item codes as keys — prefer explicit `customCartonBoxes` map on `Consumption` type for clarity.</step>
    <step>Mixed line loop: if `line.customBoxCode` set → increment custom box count by 1 per sheet line; skip `mixedBoxFamilies` for that line.</step>
    <step>In `buildPackagingDeductionPreview`, after product loops, deduct custom carton boxes by direct item code lookup.</step>
    <step>Missing mapping message: `No custom carton box item for code "…"` only when count &gt; 0.</step>
    <step>Mirror logic in `summarizePackagingConsumptionExcludingReady` (respect `deductCarton`).</step>
  </task>
</tasks>

<verification>
- Seed packaging; Haider grid shows five new CUSTOM BOX rows with balance columns.
- Unit-style: hybrid sheet line with `customBoxCode: custom-box-500ml` → preview includes 1× CUSTOM BOX 500 ML per physical row.
- Family-based mixed box NOT added when `customBoxCode` present.
- Gate delivered on Nimra-filled custom carton deducts selected custom box only (plus product bottles/caps/stickers for fill portion).
</verification>
