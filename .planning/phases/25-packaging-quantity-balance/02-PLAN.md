---
wave: 2
depends_on: ["25-packaging-quantity-balance/01-PLAN.md"]
gap_closure: false
files_modified:
  - "lib/packagingFillingDeduction.ts"
  - "app/api/batch-filling/route.ts"
  - "lib/models/BatchFillingDailyEntry.ts"
  - "lib/models/PackagingStockMovement.ts"
autonomous: true
---

<phase_goal>
When **Rashid** saves daily filling, **bottles filled today** automatically increase **UIP** for mapped empty **bottle** and **cap** packaging items (Used In Production).
</phase_goal>

<must_haves>
- [ ] New helper `lib/packagingFillingDeduction.ts`: map `productCode` / packing → bottle + cap `PackagingItem` codes (reuse `findProductItem` patterns from `packagingDeduction.ts`).
- [ ] On `PATCH /api/batch-filling`, compare new `filledBottlesToday` per line vs previous entry for same `batchNo`+`entryDate`; apply **delta only** to UIP.
- [ ] Store on `BatchFillingDailyEntry` optional `packagingUipApplied` snapshot (per line bottle counts already applied) for idempotent re-save.
- [ ] Create `PackagingStockMovement` with `reason: "filling"`, note includes batch no + product + date.
- [ ] Block save if delta would make `packagingBalance(item) < 0` (insufficient stock).
- [ ] Rashid UI toast or error message lists short SKU names when blocked.
</must_haves>

<tasks>
  <task id="1" name="filling-deduction-engine">
    <step>Implement `computeFillingUipDelta(previousLines, newLines, catalog, packagingItems)` returning lines to `$inc`.</step>
    <step>Handle new entry (no previous) as full filledBottlesToday counts.</step>
  </task>

  <task id="2" name="batch-filling-hook">
    <step>Wrap batch-filling save in transaction or sequential updates: validate stock → update entry → increment UIP → movements.</step>
    <step>Persist `packagingUipApplied` on entry after successful apply.</step>
  </task>
</tasks>

<verification>
- `npm run build` passes.
- Saving 50 filled bottles increments UIP on mapped bottle SKU by 50 (and cap if mapped).
- Re-saving same numbers does not double-count.
- Increasing filled count applies only the difference.
</verification>
